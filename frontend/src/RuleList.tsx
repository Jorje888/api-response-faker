import React from "react";

interface Rule {
    id: number;
    name: string;
    path: string;
    method: string;
    statusCode: number;
    contentType: string;
    responseBody: string;
}

interface RuleList{
    rules: Rule[];
}

function RuleList({ rules }: RuleList) {
    return (
        <div>
            <h2>Rule List</h2>
            <ul>
                {rules.map((rule) => (
                    <li key={rule.id}>
                        <h3>{rule.name}</h3>
                        <p>Path: {rule.path}</p>
                        <p>Method: {rule.method}</p>
                        <p>Status Code: {rule.statusCode}</p>
                        <p>Content Type: {rule.contentType}</p>
                        <p>Response Body: {rule.responseBody}</p>
                    </li>
                ))}
            </ul>
            {rules.length === 0 && <p>No rules added yet.</p>}
        </div>
    );
}


export default RuleList;