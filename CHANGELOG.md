# Changelog

## [0.6.1](https://github.com/psanders/proyecta/compare/v0.6.0...v0.6.1) (2026-09-22)


### Bug Fixes

* **deps:** pin mysql2 to a patched version via npm overrides ([#46](https://github.com/psanders/proyecta/issues/46)) ([10f2518](https://github.com/psanders/proyecta/commit/10f25185894dd302e0b393fefd3f9891bfab518a))

## [0.6.0](https://github.com/psanders/proyecta/compare/v0.5.0...v0.6.0) (2026-09-22)


### Features

* **deploy:** redirect HTTP to HTTPS and renew certs via webroot ([#37](https://github.com/psanders/proyecta/issues/37)) ([ee8a4ea](https://github.com/psanders/proyecta/commit/ee8a4ead904be003dd0ef4c54cec37e3281ed29b))
* **web:** add the Meta pixel with PageView and CTA Leads ([#34](https://github.com/psanders/proyecta/issues/34)) ([cba5265](https://github.com/psanders/proyecta/commit/cba52651824f45e433d64037d30130661fd7b0b5))

## [0.5.0](https://github.com/psanders/proyecta/compare/v0.4.0...v0.5.0) (2026-09-15)


### Features

* screen description, coordinates, tags and resolution ([#30](https://github.com/psanders/proyecta/issues/30)) ([8385f50](https://github.com/psanders/proyecta/commit/8385f500d16ffe8754da63e5b8a7ce057117c258))

## [0.4.0](https://github.com/psanders/proyecta/compare/v0.3.0...v0.4.0) (2026-09-15)


### Features

* owner review of ads on their screens ([#28](https://github.com/psanders/proyecta/issues/28)) ([5e94ee6](https://github.com/psanders/proyecta/commit/5e94ee6cd3ff7a8b7a56b6de0da9e39739a1cb07))

## [0.3.0](https://github.com/psanders/proyecta/compare/v0.2.1...v0.3.0) (2026-09-15)


### ⚠ BREAKING CHANGES

* **api:** the apiserver no longer reads DATABASE_URL, IDENTITY_*, DASHBOARD_URL, PORT or MEDIA_DIR from the environment. Production needs /opt/proyecta/config/proyecta.json (see docs/deploy/PENDING.md) and local setups need config/proyecta.json (npm run db:up writes it).

### Features

* advertiser ads and the dashboard view per business ([#24](https://github.com/psanders/proyecta/issues/24)) ([c59a18a](https://github.com/psanders/proyecta/commit/c59a18ad70f81d28cb20cb9fe6dbf9231c9e468a))


### Refactoring

* **api:** read settings from config/proyecta.json instead of .env ([#23](https://github.com/psanders/proyecta/issues/23)) ([5bfcb24](https://github.com/psanders/proyecta/commit/5bfcb2442649ed57d1016457c431fc7db5e875f4))

## [0.2.1](https://github.com/psanders/proyecta/compare/v0.2.0...v0.2.1) (2026-09-15)


### Bug Fixes

* **deploy:** stop the proxy from routing hosts to recreated containers' old IPs ([#22](https://github.com/psanders/proyecta/issues/22)) ([bd9a340](https://github.com/psanders/proyecta/commit/bd9a340e23dfe119f661d8e14fa2b007e9477ce1))


### Refactoring

* **dashboard:** english route paths and query params ([#16](https://github.com/psanders/proyecta/issues/16)) ([0346601](https://github.com/psanders/proyecta/commit/0346601010b68c1d7021938a56278858f13b9564))

## [0.2.0](https://github.com/psanders/proyecta/compare/v0.1.0...v0.2.0) (2026-09-15)


### Features

* **api:** per-user language and localized API messages ([f4d8cd1](https://github.com/psanders/proyecta/commit/f4d8cd1c8ec47538b7214566022fe9ad4f33a7ce))
* **dashboard:** add English alongside Spanish, chosen in Mi perfil ([b5f0f28](https://github.com/psanders/proyecta/commit/b5f0f28f9f9c9a2dc36ef8e83bedca5fa8bed375))
* **dashboard:** dark mode with Apariencia on Mi perfil ([a00b915](https://github.com/psanders/proyecta/commit/a00b9152d5d2d2edae0fe7806899c97bf6291020))
* **dashboard:** dark mode with Apariencia on Mi perfil ([9835f25](https://github.com/psanders/proyecta/commit/9835f25876cbd91784121ad2432cd178c1d86a0b))
* **dashboard:** Spanish and English, chosen in Mi perfil ([9843e08](https://github.com/psanders/proyecta/commit/9843e08eaafc825bd0175978969f056e2f80cc7f))


### Bug Fixes

* **ci:** guard deploy config and use OpenSSH for the deploy step ([50b32ea](https://github.com/psanders/proyecta/commit/50b32ea6e989a321e6ae20f0fd5f4c3234e6ebae))
* **ci:** refuse to deploy without a compose dir; use OpenSSH for deploy ([a4ee288](https://github.com/psanders/proyecta/commit/a4ee28881fd8e1ba54b1bfa23a51a2932fa234c6))
* **dashboard:** keep the browser language until one is chosen ([cb198a4](https://github.com/psanders/proyecta/commit/cb198a4babc4184f2098d297c8d63b09cfc2cd6c))
* name the production compose file compose.yaml, matching QCobro ([d7bae39](https://github.com/psanders/proyecta/commit/d7bae39927f24b01f7a5162665203bf7e35d7143))
* name the production compose file compose.yaml, matching QCobro ([1ba3458](https://github.com/psanders/proyecta/commit/1ba34581db903cbddab92378c0f66bf1420cde9f))
