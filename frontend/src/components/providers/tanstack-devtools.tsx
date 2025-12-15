'use client'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools'

export function TanStackDevtoolsWrapper() {
  return (
    <TanStackDevtools
      config={{
        openHotkey: [],
      }}
      plugins={[
        {
          name: 'TanStack Query',
          render: <ReactQueryDevtoolsPanel />,
          defaultOpen: true,
        },
        {
          name: 'TanStack Form',
          render: <FormDevtoolsPanel />,
          defaultOpen: true,
        },
      ]}
    />
  )
}

