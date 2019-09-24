import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.table("event_changes", t => {
    t.text("title");
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.table("event_changes", t => {
    t.dropColumn("title");
  });
}
