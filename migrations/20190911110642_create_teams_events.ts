import * as Knex from "knex";

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable("teamsEvents", t => {
    t.increments();
    t.integer("team").unsigned();
    t.string("lectureId");
    t.string("season");
    t.integer("year");
    t.integer("semester");
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable("teamsEvents");
}
