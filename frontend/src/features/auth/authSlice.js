// Authentication currently uses React context; this file reserves the requested feature boundary.
export const authInitialState = Object.freeze({ user: null, status: "idle" });