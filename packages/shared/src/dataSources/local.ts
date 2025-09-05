import { DataSource } from 'typeorm';

const dataSource: DataSource = makeDatasource();

function makeDatasource(): DataSource {
  try {
    return new DataSource({
      type: 'postgres',
      url: process.env['DATABASE_URL'],
      entities: [],
      migrations: [],
    });
  } catch {
    return {} as DataSource;
  }
}

export default dataSource;
