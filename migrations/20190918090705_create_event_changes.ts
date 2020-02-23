import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("event_changes", t => {
    t.increments();
    t.string("lectureId");
    t.integer("eventId");
    t.string("param");
    t.string("old");
    t.string("new");
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("event_changes");
}
