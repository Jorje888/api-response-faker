import axios from "axios";
import assert from "assert";
const target = "http://localhost:3000";

/**
 * Testing strategy for the login functionality.
 * Note: testing requires a running backend server and successfully completed registration tests
 *
 * Valid login should return 200 status code and an authtoken
 * Incorrect password should return 400 status code
 * If user is not registered should return 400 status code
 * Missing username or password should return 400 status code
 */
describe("Login Tests", function () {
  this.timeout(10000);

  it("Valid login should return 200 status code and an authtoken", async function () {
    const response = await axios.post(target + "/login", {
      username: "testuser",
      password: "testpass",
    });
    assert.strictEqual(response.status, 200);
    assert.ok(response.data.token);
  });

  it("Incorrect password should return 400 status code", async function () {
    try {
      await axios.post(target + "/login", {
        username: "testuser",
        password: "wrongpass",
      });
    } catch (error: any) {
      if (error.response) {
        assert.strictEqual(error.response.status, 400);
      } else {
        throw error;
      }
    }
  });

  it("If user is not registered should return 400 status code", async function () {
    try {
      await axios.post(target + "/login", {
        username: "notregistered",
        password: "testpass",
      });
    } catch (error: any) {
      if (error.response) {
        assert.strictEqual(error.response.status, 400);
      } else {
        throw error;
      }
    }
  });

  it("Missing username or password should return 400 status code", async function () {
    try {
      await axios.post(target + "/login", {
        username: "testuser",
        password: "",
      });
    } catch (error: any) {
      if (error.response) {
        assert.strictEqual(error.response.status, 400);
      } else {
        throw error;
      }
    }

    try {
      await axios.post(target + "/login", {
        username: "",
        password: "testpass",
      });
    } catch (error: any) {
      if (error.response) {
        assert.strictEqual(error.response.status, 400);
      } else {
        throw error;
      }
    }
  });
});
