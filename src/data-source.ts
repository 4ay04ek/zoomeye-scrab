import "reflect-metadata";
import { DataSource } from "typeorm";
import { Host } from "./entity/Host";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "lieless",
  database: "postgres",
  synchronize: true,
  logging: false,
  entities: [Host],
  migrations: [],
  subscribers: [],
});

AppDataSource.initialize();
