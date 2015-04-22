// Creates a new MongoDB collection on the
// server and cache connected to server collection
// on the client
Tasks = new Mongo.Collection("tasks");

// This code only runs on the client
if (Meteor.isClient) {

  // Client request data for this 'publication' from server
  Meteor.subscribe("tasks");

  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        // If hide completed is checked, filter tasks
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        // Otherwise, return all of the tasks
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({

    "submit .new-task": function (event) {
    // This function is called when the new task form is submitted

    var text = event.target.text.value;

    Meteor.call("addTask", text);
    // Tasks.insert({
    //   text: text,
    //   createdAt: new Date(),
    //   owner: Meteor.userId(),  // _id of logged in user
    //   username: Meteor.user().username // username of logged in user
    // });

    // Clear form
    event.target.text.value = "";

    // Prevent default form submit
    return false;
    },

    // Session is convenient place to store temp UI state
    // and can be used in helpers just like a collection
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
    }

  });

  // Check if current user is the task owner
  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  })

  // task event handlers
  Template.task.events({
    "click .toggle-checked": function () {
      // Set toggle property to opposite of current (note: inside
      // the event handlers, 'this' refers to an individual task object)
      Meteor.call("setChecked", this._id, ! this.checked);
      // Tasks.update(this._id, {$set: {checked: ! this.checked}});
    },
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
      // Tasks.remove(this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.private);
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addTask: function (text) {
    // Make sure the user is logged in before inserting a task
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteTask: function (taskId) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      // If task is private, only owner can delete it!
      throw new Meteor.Error("not-authorized");
    }
    Tasks.remove(taskId);

  },
  setChecked: function (taskId, setChecked) {
    var task = Tasks.findOne(taskId);
    if (task.private && task.owner !== Meteor.userId()) {
      throw new Meteor.error("not-authorized");
    }
    Tasks.update(taskId, { $set: { checked: setChecked} });
  },
  setPrivate: function (taskId, setToPrivate) {
    var task = Tasks.findOne(taskId);

    // Make sure only a task owner can make a task private
    if (task.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }
    Tasks.update(taskId, { $set: { private: setToPrivate } });
  }
});

// Server code
if (Meteor.isServer) {
  // 'publish' registers a "tasks" publication
  // that can be 'subscribed' to on the client
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}

