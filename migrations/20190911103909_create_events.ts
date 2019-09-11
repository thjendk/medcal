import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("events", t => {
    t.increments();
    t.string("lecture_id");
    t.text("title");
    t.string("type");
    t.text("description");
    t.text("location");
    t.dateTime("start");
    t.dateTime("end");
    t.integer("semester");
    t.string("season", 1);
    t.string("year");
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("events");
}
