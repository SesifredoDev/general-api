const users = [];

module.exports = {
  findUserByEmail: (email) => users.find(u => u.email === email),
  addUser: (user) => users.push(user),
};