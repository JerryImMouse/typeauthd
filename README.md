# TypeAuthD
Discord authentication service primarily created for SS14, but could be used with another applications. Supports 2 database providers and SSL out of the box.

TypeAuthD is a TypeScript rewrite of my previous [ssj_auth](https://github.com/JerryImMouse/ssj_auth) for SS14. This version offers broader functionality and improved structure, making it easier to maintain and update. (The name is still a work in progress)

This application serves as an improved version of the original [ssj_auth](https://github.com/JerryImMouse/ssj_auth), with a focus on better maintainability, scalability, and more predictable behavior cause of typescript.

## Quickstart
Create discord application at [Discord Developer Portal](), copy **CLIENT_ID** and **CLIENT_SECRET** at OAuth2 page.

```bash
# Clone repository
git clone https://github.com/JerryImMouse/typeauthd.git
cd typeauthd

# Install dependencies
npm install

# Build sources
npm run build
```

Then you'll need to setup configuration. You can use `appconfig.min.jsonc`, but you had to remove comments inside and rename it to `appconfig.json`.

After that add your **CLIENT_ID** and **CLIENT_SECRET** into configuration and run the service with:

```bash
npm start
```

Now you can use **Postman**, **Bruno** or some other application to test your new authorization service.   

**For more info try to check [Project Wiki](https://github.com/JerryImMouse/typeauthd/wiki)**

## Documentation
The whole available documentation is listed at **[Project Wiki](https://github.com/JerryImMouse/typeauthd/wiki)** page.

## License
This project was originally licensed under the GNU Affero General Public License v3.0 in 2024.
As of 2025, it is licensed under the MIT License.

All the code of the repository is licensed under the [MIT License](https://github.com/JerryImMouse/typeauthd/blob/master/README.md). 
Copyright © 2025 JerryImMouse.

