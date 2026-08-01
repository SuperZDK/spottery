from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "sqlite:///./data.db"
    jwt_secret_key: str = "change-me-in-production"
    jwt_expire_days: int = 30
    internal_api_key: str = "change-internal-token-in-production"
    jingcai_data_dir: str = r"D:\data\VSCode_file\vscode_file\spottery\scrapers\data\jingcai"


settings = Settings()
