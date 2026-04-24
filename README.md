# Formex - Sistema de Gestión

Aplicación web para gestionar cobranza a crédito.

## 🚀 Inicio rápido

### Prerrequisitos
- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

### Instalación

1. **Clonar el proyecto**
```bash
git clone <repository-url>
cd formex
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
Crear archivo `.env.local` en la raíz del proyecto:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

4. **Configurar Supabase**
Ejecutar las migraciones SQL en tu proyecto Supabase:
- [Consulta prompt_Formex.md para el esquema de BD]

5. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del proyecto

```
src/
├── components/        # Componentes React
│   ├── ui/           # Componentes base
│   ├── layout/       # Layout y navegación
│   ├── shared/       # Componentes reutilizables
│   ├── clientes/     # Módulo de clientes
│   ├── cobranza/     # Módulo de cobranza
│   ├── gestores/     # Módulo de gestores
│   └── dashboard/    # Dashboard y métricas
├── pages/            # Páginas principales
├── hooks/            # Custom hooks
├── store/            # Estado global (Zustand)
├── lib/              # Utilidades (Supabase, errores)
├── utils/            # Helpers (formateo, fechas)
├── types/            # Tipos TypeScript
├── validations/      # Schemas Zod
└── index.css         # Estilos globales
```

## 🛠️ Scripts disponibles

- `npm run dev` — Inicia el servidor de desarrollo
- `npm run build` — Compila para producción
- `npm run preview` — Previsualiza la build de producción
- `npm run lint` — Ejecuta ESLint

## 📚 Documentación

- [Prompt del proyecto](./prompt_Formex.md) — Especificación completa
- [Guía de desarrollo](./DESARROLLO.md) — Convenciones y patrones
- [API Supabase](https://supabase.com/docs) — Documentación oficial

## 🔐 Roles y permisos

- **Socio** — Acceso total a todo el sistema
- **Admin** — Gestión de clientes, pagos y reportes
- **Supervisor** — Solo lectura + editar seguimientos

## 📝 Notas

- Las contraseñas en desarrollo son gestionadas por Supabase Auth
- La base de datos es single-tenant (una empresa por instancia)
- Usa RLS para asegurar los datos según rol

## 🤝 Contribuir

1. Crear rama: `git checkout -b feature/nueva-feature`
2. Commit: `git commit -am 'Agrega nueva feature'`
3. Push: `git push origin feature/nueva-feature`
4. PR: Abrir Pull Request

## 📄 Licencia

Proyecto privado - Todos los derechos reservados.
