import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("events_teachers", t => {
    t.integer("event_id")
      .unsigned()
      .notNullable()
      .references("events.id")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    t.integer("teacher_id")
      .unsigned()
      .notNullable()
      .references("teachers.id")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    t.primary(["event_id", "teacher_id"]);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("events_teachers");
}
