import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class Host {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  organization: string;

  @Column()
  service: string;

  @Column()
  ip: string;

  @Column()
  date_added: Date;
}
