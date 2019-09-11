import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("teams_events", t => {
    t.increments();
    t.integer("team").unsigned();
    t.string("lecture_id");
    t.string("season");
    t.integer("year");
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("teams_events");
}
