function postValuePair(name, value) {
  if (!name || typeof name !== "string") {
    throw new Error("Name is required.");
  }

  return fetch("/storeValuePair", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, value }),
  }).then((res) => {
    if (!res.ok) {
      return res.json().catch(() => ({})).then((body) => {
        const message = body && body.error ? body.error : "Request failed";
        throw new Error(message);
      });
    }
    return res.json().catch(() => ({}));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("value-form");
  const nameInput = document.getElementById("name-input");
  const valueInput = document.getElementById("value-input");
  const responseEl = document.getElementById("response");

  if (!form || !nameInput || !valueInput || !responseEl) {
    console.warn("Demo form elements are missing from the page.");
    return;
  }

  function setResponse(message, isError) {
    responseEl.textContent = message;
    responseEl.className = "response" + (isError ? " response--error" : " response--ok");
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = String(nameInput.value || "").trim();
    const value = valueInput.value;

    if (!name) {
      setResponse("Please provide a name.", true);
      return;
    }

    setResponse("Sending value pair…", false);

    postValuePair(name, value)
      .then(() => {
        setResponse(`Saved value for "${name}".`, false);
      })
      .catch((err) => {
        console.error("Failed to send value pair", err);
        setResponse(err.message || "Failed to send value pair.", true);
      });
  });
});

