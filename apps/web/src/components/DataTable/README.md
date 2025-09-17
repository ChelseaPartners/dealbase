# DataTable Component Library

A comprehensive, accessible, and themeable table component system following SaaS best practices.

## Overview

The DataTable component library provides a complete solution for displaying tabular data with built-in sorting, filtering, pagination, and accessibility features. It follows a design token system for consistent theming and supports multiple density presets.

## Quick Start

```tsx
import { DataTable, DealStatusBadge, ViewButton, DeleteButton } from '@/components/DataTable'

const columns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (value, row) => <span className="font-medium">{value}</span>
  },
  {
    key: 'status',
    label: 'Status',
    render: (value) => <DealStatusBadge status={value} />
  },
  {
    key: 'actions',
    label: 'Actions',
    render: (value, row) => (
      <div className="flex space-x-1">
        <ViewButton onClick={() => handleView(row.id)} />
        <DeleteButton onClick={() => handleDelete(row.id)} />
      </div>
    )
  }
]

function MyTable() {
  return (
    <DataTable
      columns={columns}
      data={myData}
      onRowClick={(row) => navigate(`/items/${row.id}`)}
      onFilter={(query) => setSearchQuery(query)}
      searchPlaceholder="Search items..."
    />
  )
}
```

## Design Tokens

The component uses CSS custom properties for theming. All colors, spacing, and typography are defined in `design-tokens.css`.

### Typography Scale
- `--text-xs` to `--text-3xl` (12px to 30px)
- Font weights: `--font-normal` (400) to `--font-bold` (700)
- Line heights: `--leading-tight` (1.25) to `--leading-relaxed` (1.625)

### Spacing Scale
- `--space-0` to `--space-24` (0px to 96px)
- Consistent 4px base unit with logical progression

### Color Roles
- **Background**: `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-tertiary`
- **Surface**: `--color-surface-primary`, `--color-surface-secondary`, `--color-surface-elevated`
- **Text**: `--color-text-primary`, `--color-text-secondary`, `--color-text-tertiary`, `--color-text-quaternary`
- **Semantic**: `--color-accent-*`, `--color-critical-*`, `--color-warning-*`, `--color-success-*`

### Density Presets
- **Compact**: 32px row height, 8px cell padding
- **Cozy**: 40px row height, 12px cell padding (default)
- **Comfortable**: 48px row height, 16px cell padding

## Components

### DataTable

Main table component with full feature set.

```tsx
interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  isLoading?: boolean
  density?: 'compact' | 'cozy' | 'comfortable'
  onRowClick?: (row: T, index: number) => void
  onSort?: (field: string, direction: 'asc' | 'desc') => void
  onFilter?: (query: string) => void
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  rowKey?: keyof T | ((row: T, index: number) => string | number)
  selectable?: boolean
  selectedRows?: T[]
  onSelectionChange?: (selectedRows: T[]) => void
}
```

### StatusBadge

Displays status with appropriate colors and styling.

```tsx
<StatusBadge 
  status="Active" 
  variant="success" 
  size="md" 
/>
```

### ActionButton

Consistent action buttons with proper accessibility.

```tsx
<ActionButton
  icon={<EyeIcon />}
  label="View details"
  variant="primary"
  size="md"
  onClick={handleClick}
/>
```

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactions
- **Screen Reader Support**: Proper ARIA labels and roles
- **Focus Management**: Visible focus indicators and logical tab order
- **Color Contrast**: WCAG AA compliant color combinations
- **Semantic HTML**: Proper table structure with headers and cells

## Theming

### Light/Dark Mode
The component automatically adapts to system preferences using CSS media queries:

```css
@media (prefers-color-scheme: dark) {
  --color-bg-primary: #0f172a;
  --color-text-primary: #f8fafc;
  /* ... other dark mode tokens */
}
```

### Custom Themes
Override design tokens for custom branding:

```css
:root {
  --color-accent-primary: #your-brand-color;
  --color-accent-secondary: #your-brand-color-dark;
}
```

## Responsive Design

- **Mobile**: Horizontal scroll with sticky headers
- **Tablet**: Optimized column widths and spacing
- **Desktop**: Full feature set with optimal layout

## Performance

- **Virtual Scrolling**: For large datasets (planned)
- **Debounced Search**: Prevents excessive filtering
- **Memoized Renders**: Optimized re-rendering
- **Lazy Loading**: Skeleton states during data fetching

## Best Practices

### Column Definition
```tsx
const columns = [
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    minWidth: '200px', // Prevent column collapse
    render: (value, row) => (
      <div className="flex items-center">
        <Icon className="mr-2" />
        <span className="truncate">{value}</span>
      </div>
    )
  }
]
```

### Row Click Handling
```tsx
const handleRowClick = (row: MyDataType) => {
  // Navigate to detail page
  router.push(`/items/${row.id}`)
  
  // Or open modal
  setSelectedItem(row)
  setModalOpen(true)
}
```

### Loading States
```tsx
<DataTable
  data={data}
  isLoading={isLoading}
  emptyMessage="No items found. Create your first item to get started."
/>
```

## Migration Guide

### From Custom Table
1. Define column configuration
2. Replace table JSX with DataTable component
3. Update event handlers to match new API
4. Apply design tokens for consistent styling

### From Third-Party Library
1. Map existing column definitions to DataTable format
2. Update styling to use design tokens
3. Replace custom components with DataTable equivalents
4. Test accessibility features

## Troubleshooting

### Common Issues

**Styling not applied**: Ensure design tokens are imported in your CSS
```css
@import '../styles/design-tokens.css';
```

**TypeScript errors**: Use proper generic types
```tsx
<DataTable<MyDataType> columns={columns} data={data} />
```

**Accessibility warnings**: Add proper ARIA labels
```tsx
<ActionButton
  icon={<Icon />}
  label="Descriptive action name"
  aria-label="Perform action on item"
/>
```

## Contributing

When adding new features:
1. Follow the design token system
2. Ensure accessibility compliance
3. Add proper TypeScript types
4. Include documentation and examples
5. Test across different screen sizes and themes
