# Frontend Validation Checklist

## Pre-Completion Requirements

Before marking any frontend task as complete, ensure the following:

### 1. **Runtime Error Check**
- [ ] No "Rendered more hooks than during the previous render" errors
- [ ] No unhandled runtime errors in browser console
- [ ] All React hooks are called in the same order every render
- [ ] No conditional hook calls (hooks always called at component top level)

### 2. **Visual Rendering Verification**
- [ ] Component renders without crashing
- [ ] All UI elements are visible and properly styled
- [ ] No layout shifts or broken styling
- [ ] Responsive design works on different screen sizes
- [ ] Loading states display correctly
- [ ] Error states display correctly

### 3. **Functionality Testing**
- [ ] All interactive elements work (buttons, inputs, dropdowns)
- [ ] Navigation works correctly
- [ ] Form submissions work as expected
- [ ] Data fetching and display works
- [ ] User interactions provide appropriate feedback

### 4. **Code Quality**
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Proper error handling implemented
- [ ] Loading states implemented
- [ ] Clean, readable code structure

### 5. **Browser Compatibility**
- [ ] Works in Chrome (latest)
- [ ] Works in Firefox (latest)
- [ ] Works in Safari (latest)
- [ ] Mobile responsive design

## Development Process

### Step 1: Code Implementation
1. Write the component/feature
2. Add proper TypeScript types
3. Implement error handling
4. Add loading states

### Step 2: Local Testing
1. Start development server: `pnpm dev`
2. Navigate to the page/feature
3. Test all functionality
4. Check browser console for errors
5. Test responsive design

### Step 3: Error Resolution
1. Fix any runtime errors immediately
2. Resolve TypeScript/ESLint issues
3. Test again to ensure fixes work

### Step 4: Final Validation
1. Verify all checklist items are complete
2. Test edge cases (empty data, loading, errors)
3. Ensure smooth user experience

## Common Issues to Watch For

### React Hooks Violations
- **Problem**: Hooks called conditionally or in different orders
- **Solution**: Always call hooks at the top level, before any early returns
- **Example**:
  ```tsx
  // ❌ WRONG - hooks after early return
  if (loading) return <Loading />
  const [state, setState] = useState()
  
  // ✅ CORRECT - hooks before early return
  const [state, setState] = useState()
  if (loading) return <Loading />
  ```

### Missing Error Boundaries
- **Problem**: Unhandled errors crash the app
- **Solution**: Implement proper error handling and fallback UI

### Missing Loading States
- **Problem**: Users see blank screens during data fetching
- **Solution**: Always implement loading states for async operations

### TypeScript Errors
- **Problem**: Type mismatches cause runtime issues
- **Solution**: Fix all TypeScript errors before completion

## Quick Debug Commands

```bash
# Check for TypeScript errors
pnpm typecheck

# Check for linting issues
pnpm lint

# Start development server
pnpm dev

# Run tests
pnpm test
```

## Emergency Fixes

If you encounter the "Rendered more hooks" error:

1. **Identify the problematic component**
2. **Move all hooks to the top of the component**
3. **Remove any conditional hook calls**
4. **Move early returns after all hooks**
5. **Test the fix immediately**

## Success Criteria

A frontend task is only complete when:
- ✅ No runtime errors
- ✅ Visual rendering works perfectly
- ✅ All functionality works as expected
- ✅ Code is clean and maintainable
- ✅ User experience is smooth and professional

Remember: **If it doesn't work visually, it's not complete!**
