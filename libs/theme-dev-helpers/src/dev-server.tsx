import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { ColorTokensPage } from './dev-server/color-tokens'

import './dev-server.css'
import '@inkdropapp/css/reset.css'
import '@inkdropapp/css/tokens.css'
import '@inkdropapp/base-ui-theme/styles/theme.css'

import { ComponentsPage } from './dev-server/components'
import { Index } from './dev-server/index'
import { VariablesPage } from './dev-server/variables'
const themePackageName = import.meta.env.THEME_NAME || ''
const themeAppearance = import.meta.env.THEME_APPEARANCE
const baseProjectPath = import.meta.env.BASE_PROJECT_PATH || ''
const styleSheets: string[] = import.meta.env.STYLE_SHEETS || []

const normalizedBase = baseProjectPath.replace(/\\/g, '/')
const fsBase = normalizedBase.startsWith('/') ? normalizedBase : `/${normalizedBase}`
const cssFiles = styleSheets.map(ss => `/@fs${fsBase}/styles/${ss}`)

cssFiles.forEach(file => {
  import(/* @vite-ignore */ file)
})

document.body.classList.add(`theme-${themePackageName}`)
if (themeAppearance) {
  document.body.classList.add(`${themeAppearance}-mode`)
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Index />,
    children: [
      { path: '', element: <VariablesPage /> },
      { path: 'tokens', element: <ColorTokensPage /> },
      { path: 'components', element: <ComponentsPage /> }
    ]
  }
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
)
