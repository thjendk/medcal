import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("teachers", t => {
    t.increments();
    t.string("name");
    t.string("email");
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("teachers");
}
