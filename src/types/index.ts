export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AppConfig {
  apiUrl: string;
  environment: 'development' | 'staging' | 'production';
}

export type RootStackParamList = {
  Home: undefined;
};
