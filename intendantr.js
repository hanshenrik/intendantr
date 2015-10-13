Ingredients = new Mongo.Collection("ingredients");
Drinks = new Mongo.Collection("drinks");

if (Meteor.isServer) {
  // This code only runs on the server
  // Only publish drinks that are public or belong to the current user
  Meteor.publish("ingredients", function () {
    return Ingredients.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });

  Meteor.publish("drinks", function () {
    return Drinks.find({
      $or: [
        { private: {$ne: true} },
        { owner: this.userId }
      ]
    });
  });
}

if (Meteor.isClient) {
  // This code only runs on the client
  Meteor.subscribe("ingredients");
  Meteor.subscribe("drinks");

  Template.registerHelper('equals',
    function(v1, v2) {
      return (v1 === v2);
    }
  );

  Template.body.helpers({
    ingredients: function () {
      if (Session.get("hideUnavailableIngredients")) {
        // If hide unavailable drinks is checked, filter ingredients
        return Ingredients.find({checked: {$ne: true}}, {sort: {name: 1}});
      } else {
        // Otherwise, return all of the ingredients
        return Ingredients.find({}, {sort: {name: 1}});
      }
    },
    hideUnavailableIngredients: function () {
      return Session.get("hideUnavailableIngredients");
    },
    availableIngredientsCount: function () {
      return Ingredients.find({checked: {$ne: true}}).count();
    },
    totalIngredientsCount: function () {
      return Ingredients.find({}).count();
    },

    drinks: function () {
      if (Session.get("hideUnavailableDrinks")) {
        // If hide unavailable drinks is checked, filter drinks
        return Drinks.find({checked: {$ne: true}}, {sort: {name: 1}});
      } else {
        // Otherwise, return all of the drinks
        return Drinks.find({}, {sort: {name: 1}});
      }
    },
    hideUnavailableDrinks: function () {
      return Session.get("hideUnavailableDrinks");
    },
    availableDrinksCount: function () {
      return Drinks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-ingredient": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      // Get values from form element
      var name = event.target.name.value;
      var type = event.target.type.value;

      // Insert a drink into the collection
      Meteor.call("addIngredient", name, type);

      // Clear form
      event.target.name.value = "";
    },
    "change .hide-unavailable-ingredients input": function (event) {
      Session.set("hideUnavailableIngredients", event.target.checked);
    },

    "submit .new-drink": function (event) {
      // Prevent default browser form submit
      event.preventDefault();

      var ingredientsIds = Ingredients.find(
        { selected: true },
        { _id: 1 }
        // TODO: Could have added name for readability
      ).map( function(item) { return item._id; });
      console.log(ingredientsIds)
      // Get value from form element
      var name = event.target.name.value;

      // Insert a drink into the collection
      Meteor.call("addDrink", name, ingredientsIds);

      // Clear form
      event.target.name.value = "";

      // Clear selected
      Meteor.call("clearSelectedIngredients");
    },
    "change .hide-unavailable-drinks input": function (event) {
      // Session.set("hideUnavailableDrinks", event.target.checked);
    }
  });

  Template.ingredient.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Template.ingredient.events({
    "click .toggle-checked": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setCheckedIngredient", this._id, ! this.checked);
    },
    "click .delete": function () {
      Meteor.call("deleteIngredient", this._id);
    },
    // "click .toggle-private": function () {
    //   Meteor.call("setPrivateLiquor", this._id, ! this.private);
    // }
  });

  Template.newDrinkIngredient.events({
    "click .toggle-selected": function () {
      // Set the checked property to the opposite of its current value
      Meteor.call("setSelectedIngredient", this._id, ! this.selected);
    }
  });

  Template.drink.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    },
    getIngredients: function () {
      // TODO: should probably be done in a nicer way!
      // Could be made global method and take drinkId as parameter
      var drink = Drinks.find(
        { _id: this._id },
        { fields: {ingredients: 1} }
      ).fetch()

      var ingredientsIds = drink[0].ingredients

      var ingredients = Ingredients.find(
        { _id: { $in: ingredientsIds } },
        { fields: {name: 1, checked: 1} }
      )

      return ingredients
    },
    isAvailable: function () {
      // TODO: find a way to not duplicate this code!
      var drink = Drinks.find(
        { _id: this._id },
        { fields: {ingredients: 1} }
      ).fetch()

      var ingredientsIds = drink[0].ingredients

      var unavailableIngredients = Ingredients.find(
        {
          _id: { $in: ingredientsIds },
          checked: true
        }
      ).count()

      return unavailableIngredients > 0
    }
  });

  Template.drink.events({
    // "click .toggle-checked": function () {
    //   // Set the checked property to the opposite of its current value
    //   Meteor.call("setChecked", this._id, ! this.checked);
    // },
    "click .delete": function () {
      Meteor.call("deleteDrink", this._id);
    },
    // "click .toggle-private": function () {
    //   Meteor.call("setPrivate", this._id, ! this.private);
    // }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
}

Meteor.methods({
  addIngredient: function (name, type) {
    // Make sure the user is logged in before inserting a drink
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    // Don't allow empty name
    if (name === '') {
      throw new Meteor.Error("empty-input");
      // TODO: show error message
    }

    Ingredients.insert({
      name: name,
      type: type,
      checked: false,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteIngredient: function (ingredientId) {
    var ingredient = Ingredients.findOne(ingredientId);

    if (ingredient.owner !== Meteor.userId()) {
      // Make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Ingredients.remove(ingredientId);
  },
  setCheckedIngredient: function (ingredientId, setCheckedIngredient) {
    var ingredient = Ingredients.findOne(ingredientId);

    if (ingredient.private && ingredient.owner !== Meteor.userId()) {
      // If the ingredient is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Ingredients.update(ingredientId, { $set: { checked: setCheckedIngredient} });
  },

  setSelectedIngredient: function (ingredientId, setSelectedIngredient) {
    var ingredient = Ingredients.findOne(ingredientId);

    if (ingredient.private && ingredient.owner !== Meteor.userId()) {
      // If the ingredient is private, make sure only the owner can check it off
      throw new Meteor.Error("not-authorized");
    }

    Ingredients.update(ingredientId, { $set: { selected: setSelectedIngredient} });
  },
  clearSelectedIngredients: function () {
    Ingredients.update(
      {}, // Select all documents
      { $set: { selected: false } },
      { multi: true } // Enable updating multiple documents
    );
  },

  addDrink: function (name, ingredientsIds) {
    // Make sure the user is logged in before inserting a drink
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    if (name === '') {
      throw new Meteor.Error("empty-input");
      // TODO: show error message
    }

    Drinks.insert({
      name: name,
      ingredients: ingredientsIds,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username
    });
  },
  deleteDrink: function (drinkId) {
    var drink = Drinks.findOne(drinkId);

    if (drink.owner !== Meteor.userId()) {
      // Make sure only the owner can delete it
      throw new Meteor.Error("not-authorized");
    }

    Drinks.remove(drinkId);
  }
});
