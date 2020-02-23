import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("otherEventsTeams", t => {
    t.integer("eventId")
      .unsigned()
      .notNullable()
      .references("events.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    t.integer("team").notNullable();
    t.primary(["eventId", "team"]);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("otherEventsTeams");
}
