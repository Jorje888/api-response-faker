import React from "react";

function RuleForm(){
    return (
        <div>
            <h2>
                add new rule
            </h2>
            <form>
                <div>
                <label htmlFor="rule-name">name the rule please</label>
                <input type="text" name="" id="rule-name" />
                </div>
                 <div>
                    <label htmlFor="rule-method">Method:</label>
                     {/* A select is usually better for method */}
                    <select id="rule-method" name="method">
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
                    <input type="number" id="rule-status" name="statusCode" defaultValue={200} min="100" max="599" /> {/* Added type number, name, default, min/max */}
                </div>
                 <div>
                    <label htmlFor="rule-contentType">Content Type:</label>
                    <input type="text" id="rule-contentType" name="contentType" defaultValue="application/json" /> {/* Added name, default */}
                </div>
                 <div>
                    <label htmlFor="rule-responseBody">Response Body (JSON or Text):</label>
                    <textarea id="rule-responseBody" name="responseBody" rows={5} cols={30}></textarea> {/* Changed to textarea, added name, rows/cols */}
                </div>

                {/* Basic styling for button */}
                <button type="submit" style={{ marginTop: '15px', padding: '10px', cursor: 'pointer' }}>Add Rule</button> {/* Updated button text */}
            </form>
            <hr style={{ margin: '30px 0' }} /> {/* Add a separator */}
        </div>
    )

}

export default RuleForm;