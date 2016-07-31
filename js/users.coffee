express       = require 'express'
router        = express.Router()
passport      = require 'passport'
_             = require 'lodash'
bodyParser    = require 'body-parser'
randomstring  = require 'randomstring'
Promise       = require 'bluebird'
fs            = require 'fs'
request       = Promise.promisifyAll require 'request'

User          = require '../models/user'
Chat          = require '../models/chat'
SharedCard    = require '../models/shared_card'
authenticated = require '../middlewares/authenticated.mw'

emailSender   = require '../emails/sender'

stat_tracker = require '../lib/stat_tracker'

init = ->
  router.post "/signin", signin
  router.post "/login", login
  router.put "/me/from_facebook", from_facebook

  router.use authenticated
  router.get '/', search
  router.get '/relations', relations
  router.get '/me', me

  router.get '/me/status', me_status

  router.put "/me", me_create_token

  router.delete '/me', me_delete

  router.get "/:id", get_user
  router.put '/:id', update
  router.post "/:id/mute", toggle_mute
  router.post "/:id/favorite", toggle_favorite
  router.post "/:id/ask_more_infos", ask_more_infos
  router.post "/:id/ask_more_cards", ask_more_cards

  router.post "/me/push", set_my_public_profile
  router.post "/:id/push", card_push

  router.get "/me/context", get_my_public_profile
  router.get "/:id/context", get_card_context

  router.put "/me/device", update_me_device

  router.post "/me/charlie", send_message
  router.post "/me/group/message", send_group_message

  router.post "/me/pictureb64", post_me_picture

  router.post "/me/copy_to_folder", copy_to_folder
  router.post "/me/delete_folder", delete_folder

  router.post "/me/geo", me_geo, compute_near_cards
  router.post "/push_to_mail", push_to_mail
  router.post "/push_to_sms", push_to_sms
  router.post "/share", share

  router.put "/me/rewards/:reward_id", put_reward

  router.get "/me/credits", get_credits
  router.put "/me/purchase/:pack_id", purchase_credits
  router.put "/me/premium_template/", purchase_cards
  router.put "/me/purchase_many/:value", purchase_many



router.get "/map", (req, res, next) ->
  User.find({}, "_id first_name last_name avatar sharing")
  .exec (err, result) ->
    #o_ "res", err, result
    if err
      return next err
    res.send _.indexBy result, "_id"
    #res.send sniper: _.indexBy(result, "_id")["54fdd008bc52d35b64e82be3"]

toggle_favorite = (req, res, next) ->
  return res.sendStatus 400 unless user_id = req.params.id

  card =  _.find(req.user.cards, (c)->
    console.log c._sender, req.body.senderId, c._sender is user_id
    return c._sender.toString() is user_id)

  return res.sendStatus 404 unless card

  card.favorite = not card.favorite

  req.user.saveAsync()
  .then ->
    res.send card.favorite

toggle_mute = (req, res, next) ->
  return res.sendStatus 400 unless user_id = req.params.id

  card =  _.find(req.user.cards, (c)->
    console.log c._sender, req.body.senderId, c._sender is user_id
    return c._sender.toString() is user_id)

  return res.sendStatus 404 unless card

  card.muted = not card.muted

  req.user.saveAsync()
  .then ->
    res.send card.muted

relations = (req, res, next) ->
  {user} = req
  {ids}    = req.query

  if ids
    ids = ids.split /,/

  unless ids.length
    res.send []
    return

  user.relations(ids)
  .then (userList)->
    user.log "relations result to send", userList
    res.send userList

search = (req, res, next) ->
  {user} = req
  {q, ids}    = req.query

  if ids
    ids = ids.split /,/

  user.search(q, ids)
  .then (userList)->
    user.log "search result to send", userList.length
    res.send userList

me = (req, res) ->
  console.log "res.send req.user", req.user.id, req.user.sharing
  res.send req.user

###
 @api {get} /users/me/status Refresh user status
 @apiName GetMeStatus
 @apiParam {Number} last_time timestamp from last_refresh
###
user_log = (user, args...) ->
  o_ "[#{user.id}] #{user.first_name} #{user.last_name}", args...

me_status = (req, res, next) ->
  {last_time, conversation_id} = req.query
  {user}      = req

  stat_tracker.hit "total_time_spend", 2

  return res.sendStatus(403) unless user
  return res.sendStatus(400) unless last_time

  last_time    = parseInt(last_time)
  current_time = Date.now()

  TIME_MARGIN = 200

  new_cards = _.filter(user.cards, (c) ->
      #user_log user, "c", new Date(last_time), "<=", c.updated ? c.when, last_time - c.when,
      last_time - TIME_MARGIN <= (c.updated?.getTime?() ? c.when.getTime())
    )

  new_notifs = _.filter user.notifs, (n) -> n.date.getTime() > last_time

  users_to_load = _.uniq _.map(new_cards, "_sender").concat _.map(new_notifs, "_user")

  #user_log user, "cards", user.cards.length, "new_cards", new_cards.length, "new_notifs", new_notifs.length, "users_to_load", users_to_load

  User.findAsync _id: $in: users_to_load, User.full_scope.join(" ") + " template"
  .then (users_loaded) ->
    users_by_id = _.indexBy users_loaded, "_id"

    new_cards = _(new_cards)
      .map((c) ->
        if users_by_id[c._sender]
          c._sender = users_by_id[c._sender].toAPI("scope", c.scope)
          c
        else
          user_log user, "E_".red, "card sender unknown", c._id
          null
      )
      .compact()
      .value()

    User.updateAsync {_id: user._id},
      $set :
        "last_status_refresh" : Date.now()
    .then ->
      user_log user, "saved" #, modified_fields

      Promise.all [
        Chat.findAsync({unread_participants: user._id}, "_participants")
        Chat.findAsync({unread_states:       user._id}, "_participants")
      ]
    .then ([unread_chats, unread_chats_state]) ->
      extra_data =
        if conversation_id
          refresh_state_chats: _.chain(unread_chats_state).pluck("_participants").flatten().filter((p) -> not user._id.equals(p)).value()
          writing_state_chats: _.chain(Chat.writing_states[conversation_id]).pluck("user_id").without(user._id.toString()).value()
        else
          {}

      new_notifs = _(new_notifs)
        .map (n) ->
          # user_log user, "notif user", n._user, users_by_id[n._user]?
          if users_by_id[n._user]
            notif_user_scope = _.find(user.cards, (c) -> users_by_id[n._user]._id.equals(c._sender))?.scope
            # user_log user, "notif_user_scope", notif_user_scope
            n._user = users_by_id[n._user].toAPI("scope", notif_user_scope)
            n
          else
            o_ user.id, "E_".red, "card sender unknown", n._id
            null
        .value()

      waiting_chats = _.chain(unread_chats).map("_participants").flatten().filter((p) -> not user._id.equals(p)).value()

      user_log user, "new notifs" ,new_notifs.length, "new cards", new_cards.length, "waiting_chats", waiting_chats.length, "current_time", new Date(req.started_at), "took", (Date.now() - current_time) / 1000, (Date.now() - req.started_at) / 1000

      res.send result = _.extend extra_data,
        time:     req.started_at
        unread:
          notifs: new_notifs
          cards:  new_cards
          chats:  waiting_chats


    #req.user.log "status", "notifs", result.unread.notifs.length, "cards", result.unread.cards.length

update = (req, res, next) ->
  # console.log req.body, req.headers
  {body, user} = req
  console.log "PUT users/:id -> update", body

  #return next 403 unless body._id isnt user._id.toString()

  notif_modifiable_fields = [
        "birth_date"
        "localisation"
        "email"
        "email2"
        "first_name"
        "last_name"
        "avatar"
        "birthdate"
        "job"
        "company"
        "phone1"
        "phone2"
        "charlie_zone"
        "website"
        "social"
        "preferences"
        "template"
    ]

  updatedUser = body
  oldUser     = _.pick(user, notif_modifiable_fields)

  if !req.body.password
    #if req.body.password is req.body.password_confirm
      #updatedUser.password = User.generateHash req.body.password
    #else
      return res.status(401).send "passwords not identical"

  ### Notification on change ###
  changed = []
  _.each updatedUser, (new_value, field) ->
    return true if field.match /^preferences/
    old_value = old_value?.toObject?() or old_value
    old_value = oldUser[field]?.toObject?() or oldUser[field]
    if _.isObject(new_value)
      _.each new_value, (v, k) ->
        if old_value?[k] isnt v
          changed.push field + "." + k
        true
    else if not _.isEqual(old_value, new_value) and field isnt "birth_date" and new_value
      user.log "#{field} differ", "old", old_value, "(#{typeof old_value})", "new", new_value, "(#{typeof new_value})", _.isEqual(old_value, new_value)
      changed.push field
      user[field] = new_value

    true


  user.log "new user data", changed, _.pick(updatedUser, changed)

  if changed.length
    user.propagate_notif "contact.update", changed

  User.updateAsync {_id: user._id}, { $set: updatedUser}
  .then ->
    User.findOneAsync {_id: user._id}
  .then (user_loaded)->
    if r = user_loaded.reward "profile.completion"
      user_loaded.log "got reward"
      user_loaded.saveAsync()
      .then ->
        user_loaded
    else
      user_loaded

  .then (user_loaded)->
    user_loaded.log "rewarded?"

    user_loaded.toAPI("login")
    .then (to_login) ->

      if user_loaded.notifs.length is 0
        user_loaded.has_notif "welcome"

        user_loaded.saveAsync().then ->
          to_login
      else
        to_login

  .then (to_login) ->
    res.send to_login
  .catch (err) ->
    if err
      o_ "E_".red, err.message
      return next 500

me_create_token = (req, res, next) ->
  o_ "put /me", req.body #, req.headers
  {access_token, device} = req.body

  if access_token
    User.auth_with_token access_token
    .then (user) ->
      user.log "auth_with_token"
      if user
        user.device = device if device
        Promise.all [
            user.create_token()
            user.toAPI("login")
          ]
        .spread (token, user_data) ->
          o_ "token", token
          time:   Date.now()
          token: token
          me:    user_data
      else
        o_ "E_".yellow, "no user found for access_token", access_token
        404

    .then (response) ->
      if _.isObject response
        res.send response
      else
        res.send {}
    .catch (e) ->
      o_ "E_".red, e.message, e.stack
      next 500
  else
    next 403

me_delete = (req, res, next) ->
  o_ "delete /me", req.body
  User.updateAsync {
      cards: $elemMatch: _sender: req.user._id
    }, {
      $pull: cards: _sender: req.user._id
    }, {multi: true}
  .then (args...) ->
    o_ "cards deleted", args...
    Chat.removeAsync({_participants: req.user._id})
  .then ->
    o_ "chats deleted", arguments
    # TODO : delete notifs
    req.user.removeAsync()
  .then ->
    o_ "user deleted"
    res.sendStatus(200)

from_facebook = (req, res, next) ->
  o_ "put /me/from_facebook".green, req.body, req.headers
  return next 403 unless req.body.access_token

  User.auth_from_facebook req.body.access_token
  .then (user) ->
    #o_ "user", user
    Promise.all [
      user.create_token()
      user.toAPI("login")
    ]
    .spread (token, user_data) ->
      o_ "create_token", token
      if user.upsert is "inserted"
        stat_tracker.user_activity user, "facebook_signin"
      else
        stat_tracker.user_activity user, "facebook_login"

      time:   Date.now()
      token:  token
      me:     user_data
      upsert: user.upsert
    .then (response) ->
      res.send response
  .catch (e) ->
    o_ "E_".red, e.message, e.stack
    next 500

update_me_device = (req, res, next) ->
  {device} = req.body
  {user}   = req

  if device

    # Clean other user using same device
    User.updateAsync(
      {
        "device.token": device.token
        _id: $ne: user._id
      }
      {$set: "device.token": null}
      {multi: true}
    )
    .then ->
      # Save user device if differ
      unless _.isEqual user.device, device
        user.log "not equal updating device", user.device, device
        user.device = device
        user.saveAsync()
    .then ->
      res.sendStatus 200

    .catch (e) ->
      o_ "E_".red, e.message, e.stack
      next 500
  else
    res.sendStatus 200

router.get "/me/counters", authenticated, (req, res, next) ->
  {user} = req

  Promise.all [
    User.countAsync
      cards: $elemMatch:
        _sender:  req.user._id
        accepted: true
    User.countAsync
      _id: $in: _.map user.accepted_contacts(), (c) -> c._sender
      cards: $elemMatch:
        _sender:  req.user._id
        accepted: true
  ]
  .spread (shared, reciprocal) ->
    res.send
      shared:     shared
      reciprocal: reciprocal

router.get "/me/sharedCards", authenticated, (req, res, next) ->
  {user} = req

  User.findAsync
    cards: $elemMatch:
      _sender: req.user._id
      accepted: true
  .then (users) ->

    cards_to_send = []

    for usr in users
      userTmp =
      {
        '_id': usr._id
        'first_name': usr.first_name
        'last_name': usr.last_name
        'avatar': usr.avatar
        'template': usr.template
      }
      cards_to_send.push(userTmp)

    o_ "shared cards length", cards_to_send.length
    o_ cards_to_send
    res.send cards_to_send

me_geo = (req, res, next) ->
  o_ "/me/geo", req.body, req.query, req.headers

  {location, template, tag, scope, charlie_zone} = req.body
  {user} = req
  return res.sendStatus 400 unless location?.latitude and location?.longitude
  return res.sendStatus 403 unless user


  user.template     = template
  # if charlie_zone and charlie_zone isnt user.charlie_zone
  #   user.charlie_zone = charlie_zone
  #   user.propagate_notif "charlie_zone.update", {charlie_zone}

  stat_tracker.hit "pulse"
  stat_tracker.user_activity user, "pulse", location.latitude + "," + location.longitude

  user.sharing.unshift sharing =
    where: [
      parseFloat location.latitude
      parseFloat location.longitude
    ]
    scope:    User.clean_scope scope
    tag:      tag
    _raw_data:
      location: location

  user.saveAsync()
  .then (args...) ->
    next()
  .catch (err) ->
    o_ "E_".red, "me_geo", err?.message
    next()



compute_near_cards = (req, res, next)->
  {location, scope} = req.body
  {user} = req

  user.log "compute_near_cards", req.body
  coords = [
    parseFloat location.latitude
    parseFloat location.longitude
  ]
  user.nearUsers(coords)
  .then (nearUsers)->
    user.log "nearUsers out", nearUsers.length #, _.map nearUsers, (u) -> u.first_name + " " + u.last_name + " " + u.sharing.length

    user.scope = scope

    res.send [] #nearUsers


    _continue = ->
      unless u = nearUsers.pop()
        return
      #user.log "#{u.first_name} #{u.last_name}", "has_card ?", new Date()
      User.shareCard(user, u)
      .delay(100)
      .then ->
        #o_ "_continue recall"
        _continue()

    Promise.resolve().delay(4700).then -> _continue()

  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500

signin = (req, res, next)->
  console.log "signin", req.body
  {email, password} = req.body
  return next 400 unless email and password
  email    = email.trim().toLowerCase()
  password = password.trim()
  User.findOneAsync
    $or: [
      { email: email }
      { id: "local:" + email}
    ]
  .then (user)->
    if not user?
      newUser = new User
        id: "local:#{email}"
        email: email
      newUser.password = User.generateHash password
      stat_tracker.user_activity newUser, "mail_inscription"
      newUser.has_notif "welcome"
      newUser.saveAsync()
    else
      res.sendStatus 400
      throw new Error "User account already present"

  .then (updated_users) ->
    u = updated_users[0]
    Promise.all [
        u.create_token()
        u.toAPI("login")
      ]
    .spread (token, user_data) ->
      emailSender.sendWelcome user_data
      res.send
        time:   Date.now()
        token: token
        me: user_data
  .catch (e) ->
    o_ "E_".red, email, password, e.message, e.stack


login = (req, res, next)->
  console.log "login", req.body
  {email, password} = req.body
  return next 400 unless email and password
  email    = email.trim().toLowerCase()
  password = password.trim()
  User.findOne id: "local:" + email,  (err, user)->
      if user? and user.validPassword password
        Promise.all [
            user.create_token()
            user.toAPI("login")
          ]
        .spread (token, user_data) ->
          stat_tracker.user_activity user, "mail_login"
          res.send
            time:   Date.now()
            token: token
            me:    user_data
      else
        res.sendStatus 401

get_user = (req, res, next) ->
  {user}  = req
  user_id = req.params.id

  # TODO : not get all cards
  user.getCard user_id
  .then (card) ->
    #o_ "get_user", user_id, card
    res.send card
  .catch (err) ->
    o_ "E_".red, "get_user", err?.message, err?.stack
    res.sendStatus 500


post_me_picture = (req, res, next)->
  o_ "post_me_picture"
  return next 400 unless req.body.b64
  {user} = req

  filename = "#{randomstring.generate()}.jpeg"
  path = require('path').join(__dirname,"../statics/",filename)
  console.log "storing path", path
  fs.writeFile path, req.body.b64, 'base64', (err)->
    console.log err
    return next 500 if err
    o_ "response avatar", avatar: "#{ROOT_URL}/statics/" + filename
    res.send avatar: "#{ROOT_URL}/statics/" + filename
    # USER UPDATE DISABLED
    ###
    User.updateAsync {
      "auth_tokens.token": req.headers.token
    },
      avatar: "#{ROOT_URL}/statics/" + filename
    .then ->
      o_ "updated ?", "#{ROOT_URL}/statics/" + filename
      res.send avatar: "#{ROOT_URL}/statics/" + filename
      o_ "user.propagate_notif ?", user.propagate_notif?
      user.propagate_notif "contact.update", ["avatar"]
    ###


card_push = (req, res, next)->
  {user} = req
  {_id, scope, template, tag, from} = req.body

  User.findOneAsync
    "_id": _id
  .then (receiver) ->
    user?.log "card_push", receiver?.disp?(), scope, template, tag, from

    return res.sendStatus 404 unless receiver
    receiver.push_card
      _sender:  user
      scope:    scope
      tag:      tag
      from:     from

    # Save current Template as User template
    user.template = template

    card = _.find(user.cards, (c) -> c._sender.equals(receiver._id))

    if card and not card.accepted
      card.accepted = true
    else if not card
      card = user.processPendingCard receiver._id, true

    Promise.all [
      user.saveAsync()
      receiver.saveAsync()
    ]
    .then ->
      #o_ "post user and receiver save", arguments
      card
  .then (card) ->
    card
  .then (card) ->
    card._sender = card._sender?.toAPI?("scope") or card._sender
    o_ "send card", card
    res.send card
  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500


push_to_mail = (req, res, next)->

  {user} = req

  user.log "puth_to_mail"

  {email, tag, scope} = req.body

  # Create ShareCard
  card = new SharedCard
    _sender: user
    scope:   scope
    tag:     tag
    from:    "sms"

  image_url = null
  card.saveAsync()
  .then ->
    shared_card_id = card._id.toString()
    image_url = "https://api.ivipulse.com/cards/render_shared/#{shared_card_id}.jpg"

    BRANCH_LIVE_KEY = "key_live_daiJwEdybWxWSjsoYI6OcloiuxdOiqHe"
    BRANCH_TEST_KEY = "key_test_cbhPEulza4AXVoviZQ4v8jnjtugKgys3"

    request.postAsync
      url: "https://api.branch.io/v1/url"
      json: true
      body:
        branch_key: BRANCH_LIVE_KEY
        tags:       ['card']
        channel:    'mail'
        data: JSON.stringify(
          shared_card:     shared_card_id
          "$og_image_url": image_url
          "$desktop_url":  "http://ivipulse.com"
          "$fallback_url": "http://ivipulse.com"
        )
  .then ([branch_res, body]) ->
    user.log "branch result", body
    branch_link = body.url

    # send mail
    emailSender.sendCard email, user.toAPI("scope", scope),
      card_image: image_url
      card_link: branch_link

    # Find existing user
    User.findOneAsync
      "email": email
  .then (dest_user) ->
    o_ "user for email #{email} ?", dest_user?.disp?()
    return unless dest_user
    dest_user.push_card
      _sender:  user
      scope:    scope
      #template: req.body.template # TODO : ensure update template
      tag:      req.body.tag
      from:     "mail"

    stat_tracker.user_activity user, "push_to_mail", dest_user.toAPI("scope")
    dest_user.saveAsync()
  .then ->
    res.sendStatus 201

  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500

push_to_sms = (req, res, next) ->
  {tag, scope} = req.body
  {user}  = req
  # TODO : ensure update template

  user.log "push_to_sms"

  # Create ShareCard
  card = new SharedCard
    _sender: user
    scope:   scope
    tag:     tag
    from:    "sms"

  card.saveAsync()
  .then ->
    stat_tracker.user_activity user, "push_to_sms"
    res.send card._id
  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500

share = (req, res, next) ->
  {tag, scope} = req.body
  {user}  = req

  scope = User.clean_scope scope

  user.log "share", tag, scope

  SharedCard.findOneAsync
    _sender: user._id
    scope:   scope
    tag:     tag
    from:    "share"

  .then (existing_shared_card) ->

    if existing_shared_card
      o_ "existing_shared_card", existing_shared_card
      # TODO remove cache

      return SharedCard.reset_cache(existing_shared_card._id)
        .then ->
          existing_shared_card

    o_ "new sharedCard"

    # Create ShareCard
    card = new SharedCard
      _sender: user
      scope:   scope
      tag:     tag
      from:    "share"

    card.saveAsync()
    .then ->
      card
  .then (card) ->
    stat_tracker.user_activity user, "share"
    res.send card._id
  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500

ask_more_cards = (req, res, next) ->
  user_id  = req.params.id
  {body} = req
  return next 400 unless user_id
  {user} = req
  user.log "ask_more_cards", body
  user.ask_more_cards ?= []
  user.ask_more_cards.push body
  user.saveAsync()
  .then (result) ->
    res.send true
  .catch ->
    res.send false


ask_more_infos = (req, res, next)->
  user_id = req.params.id
  return next 400 unless user_id
  {user} = req
  user.ask_more_infos user_id
  .then (result) ->
    stat_tracker.hit "ask_more_infos", 1
    stat_tracker.user_activity user, "ask_more_infos", user_id
    res.send result
  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500

get_card_context = (req, res, next) ->
  user_id = req.params.id
  return next 400 unless user_id
  {user} = req

  o_ "user.get_card_context", user_id
  user.get_card_context user_id
  .then (result) ->
    o_ "get_card_context", result
    res.send result
  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500

set_my_public_profile = (req, res, next) ->
  {user} = req
  {scope, template} = req.body

  user.preferences or= public_profile: {}
  user.preferences.public_profile or= {}
  user.preferences.public_profile.card_type = "custom"
  user.preferences.public_profile.scope = scope
  user.template = template
  user.log "public_profile".yellow, user.preferences.public_profile, "template".yellow, user.template

  user.saveAsync()
  .then ->
    res.sendStatus 201
  .catch (err) ->
    o_ "E_".red, err.message, err.stack
    res.sendStatus 500


get_my_public_profile = (req, res, next) ->
  {user} = req
  res.send _.extend(
    avatar: user.avatar
    scope:  user.scope
    template: user.template
  )

copy_to_folder = (req, res, next) ->
  {user} = req
  {folder, cards} = req.body

  user.copy_to_folder folder, cards
  user.saveAsync()
  .then ->
    res.send true
  .catch (err) ->
    o_ "E_", "purchase card", err.message
    res.send error: err.message

delete_folder = (req, res, next) ->
  {user} = req
  {folder} = req.body

  o_ "delete_folder pre", user.folders, _.filter user.cards, accepted: true
  user.folders = _.without user.folders, folder
  _.each user.cards, (c) -> c.folders = _.without c.folders, folder
  o_ "delete_folder post", user.folders, _.filter user.cards, accepted: true

  user.saveAsync()
  .then ->
    res.send user.folders
  .catch (err) ->
    o_ "E_", "purchase card", err.message
    res.send error: err.message

put_reward  = (req, res, next) ->
  {user, params} = req
  {reward_id} = params

  got_reward = user.reward reward_id
  user.saveAsync()
  .then ->
    res.send got_reward

get_credits = (req, res, next) ->
  {user, body} = req
  console.log (req.user)
  res.send credits: user.credits

purchase_credits = (req, res, next) ->
  {pack_id} = req.params
  {user, body} = req

  o_ "purchase_credits", pack_id, body

  user.purchases ?= []
  user.purchases.push body
  o_ "user.credits pre", user.credits
  switch pack_id
    when "1 card premium"
      user.credits++
      stat_tracker.user_activity user,  "credits_buyed", 1

    when "pack 3 cards"
      user.credits += 3
      stat_tracker.user_activity user,  "credits_buyed", 3
    when "pack 5 cards"
      user.credits += 5
      stat_tracker.user_activity user,  "credits_buyed", 5
  o_ "user.credits post", user.credits

  user.saveAsync()
  .then ->
    res.send credits: user.credits
  .catch (err) ->
    o_ "E_", "purchase card", err.message
    res.send error: err.message

purchase_cards = (req, res, next) ->
  {user} = req
  {cards} = req.body
  user.log "purchase_cards", user.credits, cards

  user.premium_cards ?= []

  unless user.credits > 0
    res.send error: "pas assez de crédits"
    return

  _.each cards, (card_id) ->
    unless card_id in user.premium_cards
      if user.credits >= 0
        user.premium_cards.push card_id
        user.credits--
        if user.template is 'profil_bg1'
          user.template = card_id
    else
      user.log "E_", "already bought #{card_id}"
    true

  user.saveAsync()
  .then ->
    res.send
      credits:       user.credits
      premium_cards: user.premium_cards
  .catch (err) ->
    o_ "E_", "purchase card", err.message
    res.send error: err.message

send_group_message = (req, res, next) ->
  {user}    = req
  {message, groups} = req.body

  stat_tracker.hit "send_group_message"

  user.saveAsync()
  .then ->
    user.propagate_notif "group.message",
      message: message
      groups:   groups
  .then ->
    # Re retreive ourself to get last notif
    User.findOneAsync {_id: user._id}, {"notifs": 1}
  .then (updated_user) ->
    last_notif = updated_user.notifs[0]
    if last_notif._user.equals user._id
      last_notif = last_notif.toObject()
      last_notif._user =
        _id:        user._id
        first_name: user.first_name
        last_name : user.last_name
        avatar:     user.avatar
      res.send notifs: [last_notif]
    else
      res.send notifs: []
  .catch (err) ->
    user.log "E_", err.message
    res.send false

send_message = (req, res, next) ->
  {user}    = req
  {message} = req.body

  user.charlie_zone = message.substring 0, 119

  stat_tracker.hit "send_message"
  stat_tracker.user_activity user,  "send_message", user.charlie_zone


  user.saveAsync()
  .then ->
    user.propagate_notif "charlie_zone.update",
      charlie_zone: message
  .then ->
    # Re retreive ourself to get last notif
    User.findOneAsync {_id: user._id}, {"notifs": 1}
  .then (updated_user) ->
    last_notif = updated_user.notifs[0]
    if last_notif._user.equals user._id
      last_notif = last_notif.toObject()
      last_notif._user =
        _id:        user._id
        first_name: user.first_name
        last_name : user.last_name
        avatar:     user.avatar
      res.send notifs: [last_notif]
    else
      res.send notifs: []
  .catch (err) ->
    user.log "E_", err.message
    res.send false

purchase_many = (req, res) ->

  value = parseInt(req.params.value,10)
  console.log "purchase_many value = ", value 

  {user} = req
  user.credits += value

  user.saveAsync()
  .then ->
    res.send credits: user.credits
  .catch (err) ->
    res.send error: err.message

init()

module.exports = router

