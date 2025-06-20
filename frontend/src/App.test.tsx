// Import necessary functions from React Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
// Import matchers like .toBeInTheDocument() - This import is crucial for matchers like toBeInTheDocument
import '@testing-library/jest-dom';

// Import the App component we want to test
import App from './App'; // Import the App component

// ეს HttpMethod და contentType არის ტიპები რომლებიც განმარტებული იყო backend ში , და ახლა არის 
// frontend ში და აქაც მომიწია გადმოტანა რომ სწორი შედარება ყოფილიყო ამ ტიპების ტესტში.
export const HttpMethod = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
  PATCH: "PATCH",
  HEAD: "HEAD",
  OPTIONS: "OPTIONS",
  ALL: "ALL",
} as const;


export const ContentType = {
  JSON: "application/json",
  TEXT: "text/plain",
  HTML: "text/html",
  XML: "application/xml",
} as const;


// Describe block groups related tests together
describe('App Component', () => {

  // Test case 1: Initial render check
  test('renders form and empty list initially', () => {
    render(<App />); //  აქ ვარენდერებ აპს , ანუ ვქმნი აპს და ვამოწმებ მერე რას აკეთებს ...
    //i ს ვამატებთ იმისთვის რომ თუ დაგვჭირდა და case sensitive იქნება ჩანაწერი , ანუ რაღაც ასოები დიდად იქნება დაწერილი , ეს მაინც ამოიკითხავს
    // Use regex to find elements by text (case-insensitive)
    expect(screen.getByText(/add new rule/i)).toBeInTheDocument();
    expect(screen.getByText(/rule list/i)).toBeInTheDocument();
    expect(screen.getByText(/no rules added yet/i)).toBeInTheDocument();
  });



 test('allows adding a single rule and displays it in the list', async () => {
    // Test case 2: Test adding a single rule through the form
   // აქ ვარენდერებ აპს , ანუ ვქმნი აპს და ვამოწმებ მერე რას აკეთებს ...

    // წარმოვიდგინოთ რომ იუზერმა ჩაწერა , და ამას ვასიმულირებთ fireevent.change() ით . მერე დავუშვათ რომ დაასაბმითა კიდეც , და 
    // მერე ვამოწმებთ ეს კონტენტი თუ არის საერთოდ სქრინზე , ხოლო მერე ვასაბმითებთ და ვეუბნებით ტესტს , რომ აღარ არის no rules added ,
    //  რადგან უკვე დავამატეთ და ფუნქციონალმა უნდა შეცვალოს ეს ყოველივე
  

    // კონტეინერი aris დესტრუქტურიზაცია ამ აპის , ანუ თითონ ეს აპი რომ შეიქმნება , კონტეინერს მიენიჭება ამ მთლიანი კოდის მნიშვნელობა რაც ქმნის ამ აპს
    // ანუ ამ კონტეინერით შეგვიძლია ყველაზე მარტივად ვიპოვოთ კლასები და ასე შემდეგ.


    
    const { container } = render(<App />);

    // *** FIX 2: Change regex to match actual label text "Name:" ***
    const nameInput = screen.getByLabelText(/Name:/i) as HTMLInputElement;

    // These labels seem to be correctly associated (based on previous successful attempts), keep them
    const pathInput = screen.getByLabelText(/Path:/i) as HTMLInputElement;
    const statusCodeInput = screen.getByLabelText(/Status Code:/i) as HTMLInputElement;
    const responseBodyTextarea = screen.getByLabelText(/Response Body/i) as HTMLTextAreaElement;

    // *** FIX 1: Use querySelectorAll and index to get the selects since they lack names/ids ***
    const allSelects = container.querySelectorAll('select');
    const methodSelect = allSelects[0] as HTMLSelectElement; // Method is the first select
    const contentTypeSelect = allSelects[1] as HTMLSelectElement; // Content Type is the second select


    fireEvent.change(nameInput, { target: { value: 'Test Rule Name' } });
    fireEvent.change(pathInput, { target: { value: '/api/test' } });
    // Use the obtained select elements
    fireEvent.change(methodSelect, { target: { value: HttpMethod.POST } });
    fireEvent.change(statusCodeInput, { target: { value: '201' } });
    // Use the obtained select elements
    fireEvent.change(contentTypeSelect, { target: { value: ContentType.JSON } });
    fireEvent.change(responseBodyTextarea, { target: { value: '{"message": "created"}' } });

    // Assert that the input values are updated (synchronous check)
    expect(nameInput).toHaveValue('Test Rule Name');
    expect(pathInput).toHaveValue('/api/test');
    expect(methodSelect).toHaveValue(HttpMethod.POST);
    expect(statusCodeInput).toHaveValue(201);
    expect(contentTypeSelect).toHaveValue(ContentType.JSON);
    expect(responseBodyTextarea).toHaveValue('{"message": "created"}');

    // --- Simulate Form Submission ---
    const submitButton = screen.getByRole('button', { name: /Add Rule/i });
    fireEvent.click(submitButton);

    // --- Assert State Changes After Submission ---
    expect(screen.queryByText(/no rules added yet/i)).not.toBeInTheDocument();

    // Assert the new rule's details appear.
    await screen.findByText('Test Rule Name'); // Wait until 'Test Rule Name' appears

    // აქ ამმოწმებს დაამატა თუ არა ეს ტექსტი ტექსტად , რეალურად აქ ამოწმებს ჯავასკრიპტი თუ აკეთებს თავის საქმეს თითონ html ში დასამატებლად 
    // , ჯერჯერობით მეტს არაფერს ვამოწმებ

    expect(screen.getByText(/Path: \/api\/test/i)).toBeInTheDocument();
    expect(screen.getByText(`Method: ${HttpMethod.POST}`)).toBeInTheDocument();
    expect(screen.getByText(/Status Code: 201/i)).toBeInTheDocument();
    expect(screen.getByText(`Content Type: ${ContentType.JSON}`)).toBeInTheDocument();
    expect(screen.getByText(/"message": "created"/i)).toBeInTheDocument(); // Less strict check


    // --- Assert Form Fields Are Cleared (synchronous check after state update) ---
    expect(nameInput).toHaveValue('');
    expect(pathInput).toHaveValue('');
    // Check default values (assuming HttpMethod.GET and ContentType.JSON are defaults)
    expect(methodSelect).toHaveValue(HttpMethod.GET);
    expect(statusCodeInput).toHaveValue(200);
    expect(contentTypeSelect).toHaveValue(ContentType.JSON);
    expect(responseBodyTextarea).toHaveValue('');
});



test('allows adding multiple rules and displays all of them in the list by checking specific content', async () => {
     
    const { container } = render(<App />);

   // აქ ვამოწმებთ რამდენიმეს დამატება თუ არის შესაძლებელი , 
   // ანუ თავიდან ვაკეთებთ სელექთის სელექტორს აპის დარენტდერების მერე კონტეინერიდან , რომ ვასელექტორებთ მერე ყველა 
   // სელექთიანს ვიღებთ პირველს და არის მეთდის სელექთი , მეორე არის კონტენტის სელექთი
    const nameInput = screen.getByLabelText(/Name:/i) as HTMLInputElement;
    const pathInput = screen.getByLabelText(/Path:/i) as HTMLInputElement;

    // --- FIX 3: Use container.querySelectorAll for selects ---
    const allSelects = container.querySelectorAll('select');
    const methodSelect = allSelects[0] as HTMLSelectElement; // Method is the first select based on HTML
    const contentTypeSelect = allSelects[1] as HTMLSelectElement; // Content Type is the second select based on HTML

    const statusCodeInput = screen.getByLabelText(/Status Code:/i) as HTMLInputElement;
    const responseBodyTextarea = screen.getByLabelText(/Response Body/i) as HTMLTextAreaElement;
    const submitButton = screen.getByRole('button', { name: /Add Rule/i });
    // პირველი წესი დავამატოთ აქ:
    // და აქ ვცვლით ნეიმ ინფუთს და ა.შ
    fireEvent.change(nameInput, { target: { value: 'First Test Rule' } });
    fireEvent.change(pathInput, { target: { value: '/first-api' } });
    fireEvent.change(methodSelect, { target: { value: HttpMethod.GET } }); 
    fireEvent.change(statusCodeInput, { target: { value: '200' } });
    fireEvent.change(contentTypeSelect, { target: { value: ContentType.TEXT } });
    fireEvent.change(responseBodyTextarea, { target: { value: 'Hello World!' } });

    // ვაჭერთ საბმითის ღილაკს
    fireEvent.click(submitButton);

    //აქ კი ვამოწმებთ დასაბმითების მერე საწყის მდგომარეობას დაუბრუნდა თუ არ. და ასევე დაამატა თუ არა
    await screen.findByText('First Test Rule'); 
    expect(screen.getByText(/Path: \/first-api/i)).toBeInTheDocument();
    expect(screen.getByText(`Method: ${HttpMethod.GET}`)).toBeInTheDocument();
    expect(screen.getByText(/Status Code: 200/i)).toBeInTheDocument();
    expect(screen.getByText(`Content Type: ${ContentType.TEXT}`)).toBeInTheDocument();
    expect(screen.getByText(/Hello World!/i)).toBeInTheDocument();
    expect(screen.queryByText(/no rules added yet/i)).not.toBeInTheDocument();

    // --- Add the Second Rule ---
    // The form fields should have been cleared after the first submission.
    // Simulate typing new values for the second rule.
    fireEvent.change(nameInput, { target: { value: 'Second Test Rule' } });
    fireEvent.change(pathInput, { target: { value: '/second-api' } });
    fireEvent.change(methodSelect, { target: { value: HttpMethod.PUT } }); // Use the obtained select element
    fireEvent.change(statusCodeInput, { target: { value: '202' } });
    fireEvent.change(contentTypeSelect, { target: { value: ContentType.XML } }); // Use the obtained select element
    // Note: Escaping special characters like '<' and '>' in regex can be important
    fireEvent.change(responseBodyTextarea, { target: { value: '<response><status>success</status></response>' } });
    fireEvent.click(submitButton);

    // Assert second rule is visible by waiting for its unique elements
    await screen.findByText('Second Test Rule');
    expect(screen.getByText(/Path: \/second-api/i)).toBeInTheDocument();
    expect(screen.getByText(`Method: ${HttpMethod.PUT}`)).toBeInTheDocument();
    expect(screen.getByText(/Status Code: 202/i)).toBeInTheDocument();
    expect(screen.getByText(`Content Type: ${ContentType.XML}`)).toBeInTheDocument();
    // Use a less strict regex of <response><status>success</status></response> literally we are asking to see this regex
    expect(screen.getByText(/<response><status>success<\/status><\/response>/i)).toBeInTheDocument();


    // Now confirm the presence of content from *both* rules
    expect(screen.getByText('First Test Rule')).toBeInTheDocument();
    expect(screen.getByText('Second Test Rule')).toBeInTheDocument();

    // Optional: Assert form fields are cleared again after the second submission
    // You already did this in the first test case, but you could add it here too if needed.
    // expect(nameInput).toHaveValue('');
    // ... etc ...

  });
// Add the closing parenthesis for the describe block if it's missing in your full file
// });
});