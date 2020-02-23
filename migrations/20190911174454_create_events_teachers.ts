import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("eventsTeachers", t => {
    t.integer("eventId")
      .unsigned()
      .notNullable()
      .references("events.id")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    t.integer("teacherId")
      .unsigned()
      .notNullable()
      .references("teachers.id")
      .onUpdate("CASCADE")
      .onDelete("CASCADE");
    t.primary(["eventId", "teacherId"]);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("eventsTeachers");
}
