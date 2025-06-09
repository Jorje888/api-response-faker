import React from "react";

function RuleForm(){
    return (
        <div>
            <h2>
                add new rule
            </h2>
            <form>
                <label htmlFor="rule-name">name the rule please</label>
                <input type="text" name="" id="rule-name" />
                <button type="submit">please submit</button>
            </form>
        </div>
    )

}


export default RuleForm;