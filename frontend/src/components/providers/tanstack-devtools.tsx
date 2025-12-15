'use client'

import { TanStackDevtools } from '@tanstack/react-devtools'
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools'
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools'
import * as React from 'react'

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

