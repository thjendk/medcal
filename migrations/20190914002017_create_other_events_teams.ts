import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("other_events_teams", t => {
    t.integer("event_id")
      .unsigned()
      .notNullable()
      .references("events.id")
      .onDelete("CASCADE")
      .onUpdate("CASCADE");
    t.integer("team").notNullable();
    t.primary(["event_id", "team"]);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("other_events_teams");
}
