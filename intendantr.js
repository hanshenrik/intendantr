Liquors = new Mongo.Collection("liquors");
Mixers = new Mongo.Collection("mixers");
// Drinks = new Mongo.Collection("drinks");

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish drinks that are public or belong to the current user
  Meteor.publish("liquors", function () {
    return Liquors.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.publish("mixers", function () {
    return Mixers.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  // Meteor.publish("drinks", function () {
  //   return Drinks.find({
  //     $or: [
  //       { private: {$ne: true} },
  //       { owner: this.userId }
  //     ]
  //   });
  // });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("liquors");
  Meteor.subscribe("mixers");
  // Meteor.subscribe("drinks");

  Template.body.helpers({
    liquors: function () {
      if (Session.get("hideUnavailableLiquors")) {
        // If hide unavailable drinks is checked, filter liquors
        return Liquors.find({checked: {$ne: true}}, {sort: {name: 1}});
      } else {
        // Otherwise, return all of the liquors
        return Liquors.find({}, {sort: {name: 1}});
      }
    },
    hideUnavailableLiquors: function () {
      return Session.get("hideUnavailableLiquors");
    },
    availableLiquorsCount: function () {
      return Liquors.find({checked: {$ne: true}}).count();
    },

    mixers: function () {
      if (Session.get("hideUnavailableMixers")) {
        // If hide unavailable drinks is checked, filter mixers
        return Mixers.find({checked: {$ne: true}}, {sort: {name: 1}});
      } else {
        // Otherwise, return all of the mixers
        return Mixers.find({}, {sort: {name: 1}});
      }
    },
    hideUnavailableMixers: function () {
      return Session.get("hideUnavailableMixers");
    },
    availableMixersCount: function () {
      return Mixers.find({checked: {$ne: true}}).count();
    },

    // drinks: function () {
    //   if (Session.get("hideUnavailableDrinks")) {
    //     // If hide unavailable drinks is checked, filter drinks
    //     return Drinks.find({checked: {$ne: true}}, {sort: {name: 1}});
    //   } else {
    //     // Otherwise, return all of the drinks
    //     return Drinks.find({}, {sort: {name: 1}});
    //   }
    // },
    // hideUnavailableDrinks: function () {
    //   return Session.get("hideUnavailableDrinks");
    // },
    // availableDrinksCount: function () {
    //   return Drinks.find({checked: {$ne: true}}).count();
    // }
  });

  Template.body.events({
    "submit .new-liquor": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a drink into the collection
      Meteor.call("addLiquor", text);

      // Clear form
      event.target.text.value = "";
    },
    "change .hide-unavailable-liquors input": function (event) {
      Session.set("hideUnavailableLiquors", event.target.checked);
    },

    "submit .new-mixer": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get value from form element
      var text = event.target.text.value;

      // Insert a drink into the collection
      Meteor.call("addMixer", text);

      // Clear form
      event.target.text.value = "";
    },
    "change .hide-unavailable-mixers input": function (event) {
      Session.set("hideUnavailableMixers", event.target.checked);
    },

    // "submit .new-drink": function (event) {
    //   // Prevent default browser form submit
    //   event.preventDefault();

    //   // Get value from form element
    //   var text = event.target.text.value;

    //   // Insert a drink into the collection
    //   Meteor.call("addDrink", text);

    //   // Clear form
    //   event.target.text.value = "";
    // },
    // "change .hide-unavailable-drinks input": function (event) {
    //   Session.set("hideUnavailableDrinks", event.target.checked);
    // }
  });

  Template.liquor.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.liquor.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setCheckedLiquor", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteLiquor", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivateLiquor", this._id, ! this.private);
    }
  });

  Template.mixer.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.mixer.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setCheckedMixer", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteMixer", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivateMixer", this._id, ! this.private);
    }
  });

  // Template.drink.helpers({
  //   isOwner: function () {
  //     return this.owner === Meteor.userId();
  //   }
  // });

  // Template.drink.events({
  //   "click .toggle-checked": function () {
  //     // Set the checked property to the opposite of its current value
  //     Meteor.call("setChecked", this._id, ! this.checked);
  //   },
  //   "click .delete": function () {
  //     Meteor.call("deleteDrink", this._id);
  //   },
  //   "click .toggle-private": function () {
  //     Meteor.call("setPrivate", this._id, ! this.private);
  //   }
  // });

  // Accounts.ui.config({
  //   passwordSignupFields: "USERNAME_ONLY"
  // });
}

Meteor.methods({
  addLiquor: function (name) {
    // Make sure the user is logged in before inserting a drink
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    // Don't allow empty name
    if (name === '') {
      throw new Meteor.Error("empty-input");
      // TODO: show error message
    }

    Liquors.insert({
      name: name,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteLiquor: function (liquorId) {
    var liquor = Liquors.findOne(liquorId);

    if (liquor.owner !== Meteor.userId()) {
      // Make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Liquors.remove(liquorId);
  },
  setCheckedLiquor: function (liquorId, setCheckedLiquor) {
    var liquor = Liquors.findOne(liquorId);

    if (liquor.private && liquor.owner !== Meteor.userId()) {
      // If the liquor is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Liquors.update(liquorId, { $set: { checked: setCheckedLiquor} });
  },
  setPrivateLiquor: function (liquorId, setToPrivate) {
    var liquor = Liquors.findOne(liquorId);

    // Make sure only the liquor owner can make a liquor private
    if (liquor.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Liquors.update(liquorId, { $set: { private: setToPrivate } });
  },

  addMixer: function (name) {
    // Make sure the user is logged in before inserting a drink
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    // Don't allow empty name
    if (name === '') {
      throw new Meteor.Error("empty-input");
      // TODO: show error message
    }

    Mixers.insert({
      name: name,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteMixer: function (mixerId) {
    var mixer = Mixers.findOne(mixerId);

    if (mixer.owner !== Meteor.userId()) {
      // Make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Mixers.remove(mixerId);
  },
  setCheckedMixer: function (mixerId, setCheckedMixer) {
    var mixer = Mixers.findOne(mixerId);

    if (mixer.private && mixer.owner !== Meteor.userId()) {
      // If the mixer is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Mixers.update(mixerId, { $set: { checked: setCheckedMixer} });
  },
  setPrivateMixer: function (mixerId, setToPrivate) {
    var mixer = Mixers.findOne(mixerId);

    // Make sure only the mixer owner can make a mixer private
    if (mixer.owner !== Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Mixers.update(mixerId, { $set: { private: setToPrivate } });
  },

  // addDrink: function (name) {
  //   // MOCK
  //   var spirits = [ {name: 'Vodka', quantity: '5cl'}, {name: 'Kaluha', quantity: '2cl'} ]
  //   var mixers = [ {name: 'Fløte', quantity: 'topp-opp'} ]

  //   // Make sure the user is logged in before inserting a drink
  //   if (! Meteor.userId()) {
  //     throw new Meteor.Error("not-authorized");
  //   }

  //   Drinks.insert({
  //     name: name,
  //     spirits: spirits,
  //     mixers: mixers,
  //     createdAt: new Date(),
  //     owner: Meteor.userId(),
  //     username: Meteor.user().username
  //   });
  // },
  // deleteDrink: function (drinkId) {
  //   var drink = Drinks.findOne(drinkId);

  //   if (drink.owner !== Meteor.userId()) {
  //     // Make sure only the owner can delete it
  //     throw new Meteor.Error("not-authorized");
  //   }

  //   Drinks.remove(drinkId);
  // }
});
