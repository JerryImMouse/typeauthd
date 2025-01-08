# TypeAuthD
TypeAuthD is a TypeScript rewrite of my previous [ssj_auth](https://github.com/JerryImMouse/ssj_auth) for SS14. This version offers broader functionality and improved structure, making it easier to maintain and update. (The name is still a work in progress)

This application serves as an improved version of the original [ssj_auth](https://github.com/JerryImMouse/ssj_auth), with a focus on better maintainability, scalability, and more predictable behavior cause of typescript.

## Techincal Details
TypeAuthD supports native SSL certificates out-of-the-box or can operate behind a reverse proxy (W.I.P). All configuration is managed via `appconfig.json`, which follows this structure:
```jsonc
{
    "database": {
        // Database provider to use (currently supports sqlite and postgres)
        "provider": "sqlite", // or "postgres"
        "connection": "app.sqlite" // Connection string, filename for sqlite or formatted connection string for postgres
    },
    "app": {
        "port": 2424, // Port to bind the Express server
        "extraEnabled": true, // Enable an extra table in the database for custom information (JSON structure)
        "apiSecret": "key", // API secret used as a bearer token for authorization in API requests
        "https": {
            "useSSL": false, // Whether to use SSL for the application
            "keyFile": "../cert/key.pem", // Path to the private key file for SSL
            "certFile": "../cert/cert.pem" // Path to the certificate file for SSL
        },
        "locale": "en", // Locale to use, you can choose one of the ./locales/locales.json
        "admin": { // this category represents /admin/ route, controls pageSize in admin panel and JWT secret token to sign authorized users
            "pageSize": 30, // Admin Panel page size, don't set large values here, content delivery could be long. Also, all searching and pagination appears on backend(i don't want to send javascript to client).
            "jwtSecret": "jwt_is_cool" // JWT secret to sign cookie with JWT as a authorized flag
        },
        "pathBase": "" // path to use as `root`, needed due to reverse proxy support, so you should set the route you're exposing typeauthd
    },
    "discord": {
        "clientId": "CLIENT_ID", // Discord application client ID
        "clientSecret": "CLIENT_SECRET", // Discord application secret
        "redirectUri": "REDIRECT_URI" // Redirect URI, should point to /auth/login/cb route (e.g., `http(s)://127.0.0.1:2424/auth/login/cb`)
    }
}

```
Make sure to fill in all the necessary fields in `appconfig.json` for proper configuration.

## Logging
This application supports file handlers(only when `NODE_ENV=production`), you can find `lnav-fmt.json` format for `lnav` to read typeauthd logs in pretty formatting.   
Whenever server results in 500 error, it throws `client logs` to the user, so he can download them and report this situation, you, as a host, can find the situation in logs by looking over them by `id` field. This one helps in searching the context error happened in.

## Routes Overview

This app exposes some intresting routes you should know.

### `/auth` Routes
These routes are designed for user interactions and will return human-readable content. Currently, they return plain-text responses, but there are plans to rewrite them using `Pug`. Key routes under this family include:
- `/auth/login/cb`: This is a crucial route that should be specified in the Discord Developer Portal under OAuth2 settings. Ensure that the redirect URI in the portal matches this route, or Discord will reject the request due to a mismatch.  

- `auth/login`: This route is expected to present more detailed information about authorization, you can pass `uid` there, and send it to user, so TypeAuthD will automatically generate a link and expose it to user with pretty html page >w<

### `/api` Routes
The `/api` routes provide the core functionality for managing authorization data. These routes allow operations like identifying users (by name, email, etc.) and handling roles (e.g., retrieving Discord roles for a specific guild). Key routes under this family include:
- `/api/link`: This route accepts a uid as a unique identifier (for a user in an external system) and returns a generated URL. This URL will include a state parameter set to the uid, which will be Base64-encoded in future versions.

## Configuration and SSL Support
TypeAuthD is flexible in terms of SSL configuration. If `useSSL` is set to true in the config, the application will automatically load the certificate and key files specified in the `keyFile` and `certFile` paths. This ensures secure HTTPS connections for sensitive data transmission.

## Routes Details
W.I.P

## Docker Install
W.I.P

## License
All the code of the repository is licensed under [GNU Affero Public License 3.0](https://www.gnu.org/licenses/agpl-3.0.html).  
Copyright © 2024 JerryImMouse.

