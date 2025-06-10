import React from "react";

export interface Rule {
    id: number;
    name: string;
    path: string;
    method: string;
    statusCode: number;
    contentType: string;
    responseBody: string;
}

interface RuleListarr{
    rules: Rule[];
}

function RuleList({ rules }: RuleListarr) {
    return (
        <div>
            <h2>Rule List</h2>

            {rules.length===0 ? (
                <p>No rules added yet.</p>
            ):(
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
            )}
        </div>
    );
}


export default RuleList;