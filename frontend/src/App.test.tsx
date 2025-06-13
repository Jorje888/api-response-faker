// Import necessary functions from React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
// Import matchers like .toBeInTheDocument() - This import is crucial for matchers like toBeInTheDocument
import '@testing-library/jest-dom';

// Import the App component we want to test
import App from './App'; // Import the App component

// Describe block groups related tests together
describe('App Component', () => {

  // Test case 1: Initial render check
  test('renders form and empty list initially', () => {
    render(<App />); // Render the App component

    // Use regex to find elements by text (case-insensitive)
    // The wavy lines under regex might be TS/linter warnings, but the code should work
    expect(screen.getByText(/add new rule/i)).toBeInTheDocument();
    expect(screen.getByText(/rule list/i)).toBeInTheDocument();
    expect(screen.getByText(/no rules added yet/i)).toBeInTheDocument();

    // Check if list items are not present initially
    const ruleItems = screen.queryAllByRole('listitem');
    expect(ruleItems).toHaveLength(0);
  });

  // Test case 2: Test adding a rule through the form
  // This test involves asynchronous state updates after form submission,
  // so we use 'async' and 'await screen.findBy...' to wait for DOM changes.
  test('allows adding a rule and displays it in the list', async () => { // Keep async here
    render(<App />); // Render the App component

    // --- Simulate User Typing into Form Fields ---
   const nameInput = screen.getByLabelText(/Rule Name:/i) as HTMLInputElement;
const pathInput = screen.getByLabelText(/Path:/i) as HTMLInputElement;
const methodSelect = screen.getByLabelText(/Method:/i) as HTMLSelectElement;
// Note: Status Code is type="number", value is string initially, but expect.toHaveValue can handle number
const statusCodeInput = screen.getByLabelText(/Status Code:/i) as HTMLInputElement;
const contentTypeInput = screen.getByLabelText(/Content Type:/i) as HTMLInputElement;
const responseBodyTextarea = screen.getByLabelText(/Response Body/i) as HTMLTextAreaElement;

fireEvent.change(nameInput, { target: { value: 'Test Rule Name' } });
fireEvent.change(pathInput, { target: { value: '/api/test' } });
fireEvent.change(methodSelect, { target: { value: 'POST' } });
    // Status code input value is a string
    fireEvent.change(statusCodeInput, { target: { value: '201' } });
    fireEvent.change(contentTypeInput, { target: { value: 'application/json' } });
    fireEvent.change(responseBodyTextarea, { target: { value: '{"message": "created"}' } });

    // Assert that the input values are updated (synchronous check)
    expect(nameInput).toHaveValue('Test Rule Name');
    expect(pathInput).toHaveValue('/api/test');
    expect(methodSelect).toHaveValue('POST');
    // For number inputs, toHaveValue checks the parsed number
    expect(statusCodeInput).toHaveValue(201);
    expect(contentTypeInput).toHaveValue('application/json');
    expect(responseBodyTextarea).toHaveValue('{"message": "created"}');

    // --- Simulate Form Submission ---
    const submitButton = screen.getByRole('button', { name: /Add Rule/i });
    fireEvent.click(submitButton);

    // --- Assert State Changes After Submission ---
    // We expect the "no rules" message to be gone *after* the rule is added
    expect(screen.queryByText(/no rules added yet/i)).not.toBeInTheDocument();

    // Assert the new rule's details appear.
    // Use findByText and await to wait for the new rule to be rendered in the list.
    // Finding one key element is usually enough to confirm the list updated.
    await screen.findByText('Test Rule Name'); // Wait until 'Test Rule Name' appears

    // Now that we know the list item is rendered, we can use getByText for its contents
    expect(screen.getByText(/Path: \/api\/test/i)).toBeInTheDocument();
    expect(screen.getByText(/Method: POST/i)).toBeInTheDocument();
    expect(screen.getByText(/Status Code: 201/i)).toBeInTheDocument();
    expect(screen.getByText(/Content Type: application\/json/i)).toBeInTheDocument();
    expect(screen.getByText(/{"message": "created"}/i)).toBeInTheDocument();

    // Check if the list item itself exists using its role
    const ruleItemsAfterAdd = screen.getAllByRole('listitem');
    expect(ruleItemsAfterAdd).toHaveLength(1);


    // --- Assert Form Fields Are Cleared (synchronous check after state update) ---
    expect(nameInput).toHaveValue('');
    expect(pathInput).toHaveValue('');
    expect(methodSelect).toHaveValue('GET');
    expect(statusCodeInput).toHaveValue(200);
    expect(contentTypeInput).toHaveValue('application/json');
    expect(responseBodyTextarea).toHaveValue('');
  });

  // Test adding multiple rules
  // Make this async as well to correctly await the rendering of each new rule
  test('allows adding multiple rules', async () => { // Add async here
      render(<App />);

      // Add the first rule
      fireEvent.change(screen.getByLabelText(/Rule Name:/i), { target: { value: 'First Rule' } });
      fireEvent.change(screen.getByLabelText(/Path:/i), { target: { value: '/first' } });
      fireEvent.click(screen.getByRole('button', { name: /Add Rule/i }));

      // Assert first rule is visible by waiting for it
      await screen.findByText('First Rule'); // Wait for the first rule name to appear
      expect(screen.getByText(/Path: \/first/i)).toBeInTheDocument(); // Should be available after the await
      expect(screen.queryByText(/no rules added yet/i)).not.toBeInTheDocument(); // Should be gone

      // Add the second rule
      // Clear fields (optional, but good practice if the component didn't clear them,
      // but your component *does* clear them, so this step is implicitly covered
      // by the `expect(...).toHaveValue('')` checks in the previous test).
      // Simulate typing new values into the *now cleared* fields.
      fireEvent.change(screen.getByLabelText(/Rule Name:/i), { target: { value: 'Second Rule' } });
      fireEvent.change(screen.getByLabelText(/Path:/i), { target: { value: '/second' } });
      // Fill other fields with different values if needed for a more thorough test, e.g.,
      // fireEvent.change(screen.getByLabelText(/Method:/i), { target: { value: 'PUT' } });
      // fireEvent.change(screen.getByLabelText(/Status Code:/i), { target: { value: '200' } });
      // fireEvent.change(screen.getByLabelText(/Content Type:/i), { target: { value: 'text/plain' } });
      // fireEvent.change(screen.getByLabelText(/Response Body/i), { target: { value: 'OK' } });


      fireEvent.click(screen.getByRole('button', { name: /Add Rule/i }));

      // Assert both rules are visible by waiting for the second one
      await screen.findByText('Second Rule'); // Wait for the second rule name to appear

      // Now check for the presence of both rules and their details
      expect(screen.getByText('First Rule')).toBeInTheDocument();
      expect(screen.getByText(/Path: \/first/i)).toBeInTheDocument();
      expect(screen.getByText('Second Rule')).toBeInTheDocument();
      expect(screen.getByText(/Path: \/second/i)).toBeInTheDocument();


      // Check the number of list items
      const ruleItemsAfterSecondAdd = screen.getAllByRole('listitem');
      expect(ruleItemsAfterSecondAdd).toHaveLength(2);

      // Optional: Check form fields are cleared again
      // expect(screen.getByLabelText(/Rule Name:/i)).toHaveValue('');
      // expect(screen.getByLabelText(/Path:/i)).toHaveValue('');
      // ... etc.
  });
});