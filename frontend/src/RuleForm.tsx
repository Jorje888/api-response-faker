import React, { useState } from "react";
import type { Rule } from './RuleList';
import './RuleForm.css';


interface RuleFormProps {
    onAddRule: (newRule: Rule) => void;
}

function RuleForm({ onAddRule }: RuleFormProps){
    const [name, setName] = useState('');
    const [path, setPath] = useState('');
    const [method, setMethod] = useState('GET');
    const [statusCode, setStatusCode] = useState(200);
    const [contentType, setContentType] = useState('application/json');
    const [responseBody, setResponseBody] = useState('');

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const newRule: Rule = {
            id: Date.now(),
            name,
            path,
            method,
            statusCode: parseInt(statusCode as any, 10),
            contentType,
            responseBody,
        };

        onAddRule(newRule);

        setName('');
        setPath('');
        setMethod('GET');
        setStatusCode(200);
        setContentType('application/json');
        setResponseBody('');
    };

    return (
        <div className="rule-form-container">
            <h2>Add New Rule</h2>
            <form onSubmit={handleSubmit} className="rule-form">
                <div>
                    <label htmlFor="rule-name">Rule Name:</label>
                    <input
                        type="text"
                        name="name"
                        id="rule-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="rule-path">Path:</label>
                     <input
                        type="text"
                        id="rule-path"
                        name="path"
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="rule-method">Method:</label>
                     {/* A select is usually better for method */}
                    <select
                        id="rule-method"
                        name="method"
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                    >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                        <option value="OPTIONS">OPTIONS</option>
                        <option value="HEAD">HEAD</option>
                    </select>
                </div>
                 <div>
                    <label htmlFor="rule-status">Status Code:</label>
                    <input
                        type="number"
                        id="rule-status"
                        name="statusCode"
                        value={statusCode}
                        onChange={(e) => setStatusCode(parseInt(e.target.value, 10) || 0)}
                        min="100"
                        max="599"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="rule-contentType">Content Type:</label>
                    <input
                        type="text"
                        id="rule-contentType"
                        name="contentType"
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value)}
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="rule-responseBody">Response Body (JSON or Text):</label>
                    <textarea
                        id="rule-responseBody"
                        name="responseBody"
                        rows={5}
                        cols={30}
                        value={responseBody}
                        onChange={(e) => setResponseBody(e.target.value)}
                    ></textarea>
                </div>

                {/* Basic styling for button */}
                <button type="submit">Add Rule</button>
            </form>
            <hr className="rule-form-separator" /> {/* Add a separator */}
        </div>
    )

}

export default RuleForm;