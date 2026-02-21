import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SmartCollectionBuilder } from '../SmartCollectionBuilder';
import type { SmartQuery } from '../../../types/collection';

describe('SmartCollectionBuilder', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  it('should render all field options', () => {
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
      />,
    );

    const fieldSelects = container.querySelectorAll('select[aria-label="Filter field"]');
    expect(fieldSelects.length).toBeGreaterThan(0);

    const firstSelect = fieldSelects[0] as HTMLSelectElement;
    const options = firstSelect.querySelectorAll('option');
    const fieldNames = Array.from(options).map((opt) => opt.value);

    expect(fieldNames).toContain('rating');
    expect(fieldNames).toContain('iso');
    expect(fieldNames).toContain('camera_make');
  });

  it('should update operator based on selected field', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
      />,
    );

    const fieldSelects = container.querySelectorAll('select[aria-label="Filter field"]');
    const fieldSelect = fieldSelects[0] as HTMLSelectElement;
    await user.selectOptions(fieldSelect, 'filename');

    const operatorSelects = container.querySelectorAll('select[aria-label="Filter operator"]');
    const operatorSelect = operatorSelects[0] as HTMLSelectElement;
    await waitFor(() => {
      expect(operatorSelect.value).toBe('=');
    });
  });

  it('should add a new rule', async () => {
    const user = userEvent.setup();
    render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
      />,
    );

    const addButton = screen.getByRole('button', { name: /add rule/i });
    await user.click(addButton);

    // New rule defaults to rating >= 3, so we check for multiple 3 values
    const ratingInputs = screen.getAllByDisplayValue('3');
    expect(ratingInputs.length).toBeGreaterThanOrEqual(2);
  });

  it('should delete a rule', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{
          rules: [
            { field: 'rating', operator: '>=', value: 3 },
            { field: 'iso', operator: '>', value: 1600 },
          ],
          combinator: 'AND',
        }}
      />,
    );

    const deleteButtons = container.querySelectorAll('button[aria-label="Delete rule"]');
    expect(deleteButtons.length).toBe(2);

    const firstDeleteButton = deleteButtons[0] as HTMLButtonElement;
    await user.click(firstDeleteButton);

    const deleteButtonsAfter = container.querySelectorAll('button[aria-label="Delete rule"]');
    expect(deleteButtonsAfter.length).toBe(1);
  });

  it('should change combinator', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{
          rules: [
            { field: 'rating', operator: '>=', value: 3 },
            { field: 'iso', operator: '>', value: 1600 },
          ],
          combinator: 'AND',
        }}
      />,
    );

    const orButtons = container.querySelectorAll('button');
    const orButton = Array.from(orButtons).find(
      (btn) => btn.textContent?.trim() === 'OR',
    ) as HTMLButtonElement;
    expect(orButton).toBeDefined();

    if (orButton) {
      await user.click(orButton);
      await waitFor(() => {
        expect(orButton).toHaveClass('bg-blue-500', 'text-white');
      });
    }
  });

  it('should create smart collection with valid query', async () => {
    const user = userEvent.setup();
    mockOnSave.mockResolvedValue(undefined);

    render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{
          rules: [
            { field: 'rating', operator: '>=', value: 3 },
            { field: 'iso', operator: '>', value: 1600 },
          ],
          combinator: 'AND',
        }}
        initialName="Test Collection"
      />,
    );

    const createButton = screen.getByRole('button', { name: /create collection/i });
    await user.click(createButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });

    const callArgs = mockOnSave.mock.calls[0];
    expect(callArgs).toBeDefined();
    if (callArgs) {
      const calledQuery = callArgs[0] as SmartQuery;
      expect(calledQuery.rules.length).toBe(2);
      expect(calledQuery.combinator).toBe('AND');
    }
  });

  it('should disable create button when name is empty', () => {
    render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
        initialName=""
      />,
    );

    const createButton = screen.getByRole('button', {
      name: /create collection/i,
    }) as HTMLButtonElement;
    expect(createButton.disabled).toBe(true);
  });

  it('should disable create button when no rules exist', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
        initialName="Test"
      />,
    );

    const deleteButton = container.querySelector(
      'button[aria-label="Delete rule"]',
    ) as HTMLButtonElement;
    await user.click(deleteButton);

    const createButton = screen.getByRole('button', {
      name: /create collection/i,
    }) as HTMLButtonElement;
    await waitFor(() => {
      expect(createButton.disabled).toBe(true);
    });
  });

  it('should display preview count', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
        previewImageCount={42}
      />,
    );

    const previewButton = screen.getByRole('button', { name: /show preview/i });
    await user.click(previewButton);

    // Check that the preview text mentions the image count and the word "match"
    const previewDiv = container.querySelector('.mt-2.p-2.bg-white');
    expect(previewDiv).toBeInTheDocument();
    const textContent = previewDiv?.textContent || '';
    expect(textContent).toMatch(/42/);
    expect(textContent).toMatch(/match/);
  });

  it('should update collection name', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
        initialName=""
      />,
    );

    const nameInput = container.querySelector('input[placeholder]') as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, 'My Best Photos');

    expect(nameInput.value).toBe('My Best Photos');
  });

  it('should change numeric value', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SmartCollectionBuilder
        onSave={mockOnSave}
        initialQuery={{ rules: [{ field: 'rating', operator: '>=', value: 3 }], combinator: 'AND' }}
        initialName="Test"
      />,
    );

    const numberInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    await user.clear(numberInput);
    await user.type(numberInput, '5');

    expect(numberInput.value).toBe('5');
  });
});
