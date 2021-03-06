/*
borra el esquema dev
crea el esquema dev

esquema dev

tabla auth
campo id
campo email varchar(64)
campo password varchar(64)
campo username varchar(16)

tabla users
campo id
campo email varchar(64)
campo password varchar(64)
campo username varchar(16)
relacion id,id con auth

tabla prueba
campo id
campo nombre text unico
relaciona id con id en auth
relaciona nombre con email en users enulo
*/
const $ = (selector) => document.querySelector(`${selector}`);

class Table {
  name = "";
  fields = {};
  relations = [];
  constructor(name) {
    this.name = name;
  }

  getName() {
    return this.name;
  }

  setRelation(tableName, ids, properties) {
    const [local, remoto] = ids && ids.trim().split(",");
    const string = `    FOREIGN KEY (${local}) REFERENCES ${tableName}(${remoto})`;
    this.relations.push({ string, properties });
  }

  setField(field, type, properties) {
    this.fields[field] = { type, properties };
  }

  sqlRelations() {
    let relationsString = "";
    this.relations.forEach((relation) => {
      const properties = this.sqlProperties(relation.properties);
      relationsString += `${relation.string}${properties},\n`;
    });
    return relationsString;
  }

  sqlProperties(properties) {
    if (properties.length < 1) return "";
    let stringProperties = "";
    const SQL_PROPERTIES = {
      "!nulo": "NOT NULL ",
      unico: "UNIQUE",
      nulo: "NULL",
      primario: "PRIMARY KEY",
      enulo: "ON DELETE SET NULL",
      ecascada: "ON DELETE CASCADE",
      unulo: "ON UPDATE SET NULL",
      ucascada: "ON UPDATE CASCADE",
      primario: "PRIMARY KEY",
      falso: "DEFAULT FALSE",
      verdadero: "DEFAULT TRUE",
      0: "DEFAULT 0",
    };
    for (let property of properties) {
      stringProperties += " " + SQL_PROPERTIES[property];
    }
    return stringProperties;
  }

  toSQL(schema) {
    return `CREATE TABLE ${`${schema ? `${schema}.` : ""}`}${this.name} (
${(() => {
  let fields = "";
  const keys = Object.keys(this.fields);
  for (let key of keys) {
    if (key === "id" || key === `id_${this.name}` || key === `id${this.name}`) {
      fields += `    ${key} SERIAL PRIMARY KEY NOT NULL UNIQUE,\n`;
    } else {
      fields += `    ${key} ${this.fields[key].type?.toUpperCase() || ""}`;
      const properties = this.fields[key].properties;
      fields += `${this.sqlProperties(properties)},\n`;
    }
  }
  fields += this.sqlRelations();
  return fields.substring(0, fields.length - 2);
})()}
);`;
  }
}

class Schema {
  prevQuery = "";
  schema = "";
  tables = [];
  constructor() {}

  addTable(table) {
    this.tables.push(table);
  }

  setPrevSqlQuery(message) {
    this.prevQuery += `${message};\n`;
  }

  getPrevSqlQuery() {
    return this.prevQuery || "";
  }

  setSchema(name) {
    this.schema = name;
  }

  getSchema() {
    return this.schema;
  }

  findTable(name) {
    return this.tables.find((table) => table.name === name);
  }

  formatTableName(tableName) {
    return `${this.schema ? `${this.schema}.` : ""}${tableName}`;
  }

  dame(line) {
    // dame auth
    // select * from auth
    let query = "";
    const comandos = line.split(" ");
    if (comandos.length === 2) {
      query = `SELECT * FROM ${this.formatTableName(comandos[1])}`;
    } else if (comandos.length === 4) {
      const attributes = comandos[1].replace(/\,/g, ", ");
      query = `SELECT ${attributes} FROM ${this.formatTableName(comandos[3])}`;
    }
    this.setPrevSqlQuery(query);
  }
}

function generateSchema() {
  const inputValue = $("#taInput").value;
  const lines = inputValue.split("\n");
  const schema = new Schema();
  let currentTable = "";
  lines.forEach((line) => {
    if (line.substring(0, 4) === "dame") {
      schema.dame(line);
    } else if (line.includes("borra el esquema ")) {
      const schemaName = line.split("borra el esquema ")[1];
      schema.setPrevSqlQuery(`DROP SCHEMA ${schemaName} CASCADE`);
    } else if (line.includes("crea el esquema")) {
      const schemaName = line.split("crea el esquema ")[1];
      schema.setPrevSqlQuery(`CREATE SCHEMA ${schemaName}`);
    } else if (line.includes("tabla")) {
      const tableName = line.split(" ")[1];
      currentTable = tableName;
      if (currentTable) {
        const tableExists = schema.tables.findIndex(({ name }) => {
          return name.toLowerCase().includes(currentTable.toLowerCase());
        });
        if (tableExists < 0) {
          const table = new Table(tableName);
          schema.addTable(table);
        }
      }
    } else if (line.includes("campo")) {
      try {
        const table = schema.findTable(currentTable);
        const data = line.split(" ");
        const [_, nameField, typeField] = data;
        const properties = data.splice(3, line.length);
        table.setField(nameField, typeField, properties);
      } catch {}
    } else if (line.includes("relacion")) {
      const table = schema.findTable(currentTable);
      const data = line.split(" ");
      const [_, local, __, remote, ___, tableName] = data;
      const properties = data.splice(6, line.length);
      table.setRelation(tableName, `${local},${remote}`, properties);
    } else if (line.includes("esquema")) {
      const [_, name] = line.split(" ");
      schema.setSchema(name);
    }
  });
  let tables = "";
  tables += schema.getPrevSqlQuery() + "\n";
  schema.tables.map((table) => {
    tables += table.toSQL(schema.getSchema()) + "\n\n";
  });
  $("#taOutput").value = tables.substring(0, tables.length - 2);
  return tables.substring(0, tables.length - 2);
}

function copyContent() {
  navigator.clipboard.writeText(generateSchema());
}

$("#btnGenerate").addEventListener("click", () => {
  if (window.innerWidth <= 1280) {
    const currentSchema = generateSchema();
    if (currentSchema.length > 0) {
      $("#responsive-schema").innerHTML = "";
      const code = document.createElement("code");
      code.textContent = "";
      code.innerText = currentSchema;
      $("#responsive-generated-schema").style.zIndex = "1";
      $("#responsive-schema").appendChild(code);
    }
  } else {
    generateSchema();
  }
});

$("#taInput").addEventListener("keyup", () => {
  generateSchema();
});

$(".btnResponsiveCopy").addEventListener("click", copyContent);
$(".btnCopy").addEventListener("click", copyContent);

$(".responsive-close-schema").addEventListener("click", () => {
  $("#responsive-generated-schema").style.zIndex = "0";
});
