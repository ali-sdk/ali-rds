const database = process.env.CI ? 'unittest' : 'test';

module.exports = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database,
  // host: env.ALI_SDK_RDS_HOST || 'localhost',
  // port: env.ALI_SDK_RDS_PORT || 3306,
  // user: env.ALI_SDK_RDS_USER || 'root',
  // password: env.ALI_SDK_RDS_PASSWORD || '',
  // database: env.ALI_SDK_RDS_DATABASE || 'test',
};
