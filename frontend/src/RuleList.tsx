import React from "react";
import "./RuleList.css";


export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  HEAD = "HEAD",
  OPTIONS = "OPTIONS",
  ALL = "ALL",
}
export enum ContentType {
  JSON = "application/json",
  TEXT = "text/plain",
  HTML = "text/html",
  XML = "application/xml",
}
export interface Rule {
  id: number;
  name: string; // Assuming 'name' is still needed for display purposes in RuleList
  path: string;
  method: HttpMethod; // Use the HttpMethod enum
  statusCode: number;
  contentType: ContentType; // Use the ContentType enum
  responseBody: string;
}



interface RuleListarr {
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