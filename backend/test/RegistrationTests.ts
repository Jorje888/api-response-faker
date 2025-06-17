import axios from "axios";
import assert from "assert";
const target = "http://localhost:3000";

/**
 * Testing strategy for the registration functionality.
 * Note: testing automatically launches the backend server defined in server.ts
 *
 * Valid registration should return 201 status code
 * Duplicate username and password should return 409 status code
 * Duplicate username should return 409 status code
 * Missing username or password should return 400 status code
 */
describe("Registration Tests", function () {
  this.timeout(10000);

  it("Valid registration should return 201 status code", async function () {
    const response = await axios.post(target + "/register", {
      username: "testuser",
      password: "testpass",
    });
    assert.strictEqual(response.status, 201);
  });
  it("Duplicate username and password should return 409 status code", async function () {
    try {
      await axios.post(target + "/register", {
        username: "testuser",
        password: "testpass",
      });
    } catch (error: any) {
      if (error.response) {
        assert.strictEqual(error.response.status, 409);
      } else {
        throw error;
      }
    }
  });

  it("Duplicate username should return 409 status code", async function () {
    try {
      await axios.post(target + "/register", {
        username: "testuser",
        password: "newpass",
      });
    } catch (error: any) {
      if (error.response) {
        assert.strictEqual(error.response.status, 409);
      } else {
        throw error;
      }
    }
  });

  it("Missing username or password should return 400 status code", async function () {
    try {
      await axios.post(target + "/register", {
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
      await axios.post(target + "/register", {
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
