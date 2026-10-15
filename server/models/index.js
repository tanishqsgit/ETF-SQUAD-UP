import { Sequelize, DataTypes as D } from 'sequelize';
import { config } from '../config.js';
export const sequelize = new Sequelize(config.database || 'postgres://localhost/squadup', {
  dialect: 'postgres',
  logging: false,
  dialectOptions:
    process.env.DATABASE_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: true } } : {},
  pool: { max: 10, min: 0, idle: 10000 },
});
export const roles = ['rusher', 'sniper', 'assaulter', 'igl', 'nader', 'allrounder', '5th'];
export const slots = ['morning', 'afternoon', 'evening', 'night', 'late_night'];
const id = { type: D.UUID, defaultValue: D.UUIDV4, primaryKey: true };
export const User = sequelize.define(
  'User',
  {
    id,
    playerId: { type: D.STRING, allowNull: false, unique: true },
    displayName: { type: D.STRING(30), allowNull: false, validate: { len: [3, 30] } },
    phone: { type: D.STRING, allowNull: false, unique: true },
    email: { type: D.STRING, unique: true, validate: { isEmail: true } },
    passwordHash: { type: D.STRING, allowNull: false },
    avatar: D.STRING,
    bio: D.TEXT,
    games: { type: D.ARRAY(D.STRING), defaultValue: ['Free Fire'], allowNull: false },
    role: { type: D.ENUM(...roles), allowNull: false },
    rank: { type: D.STRING, allowNull: false },
    playingTime: { type: D.ARRAY(D.ENUM(...slots)), allowNull: false },
    age: { type: D.INTEGER, allowNull: false, validate: { min: 13, max: 100 } },
    device: { type: D.ENUM('android', 'ios'), allowNull: false },
    deviceModel: D.STRING,
    youtubeUrl: D.STRING,
    instagramHandle: D.STRING,
    discordId: D.STRING,
    kdRatio: { type: D.FLOAT, defaultValue: 0 },
    winRate: { type: D.FLOAT, defaultValue: 0 },
    totalMatches: { type: D.INTEGER, defaultValue: 0 },
    status: { type: D.ENUM('online', 'offline', 'in_game', 'lft', 'lfm'), defaultValue: 'offline' },
    isVerified: { type: D.BOOLEAN, defaultValue: false },
    xp: { type: D.INTEGER, defaultValue: 0 },
    level: { type: D.INTEGER, defaultValue: 1 },
    lastSeen: { type: D.DATE, defaultValue: D.NOW },
  },
  {
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['passwordHash', 'phone', 'email'] } },
    scopes: { credentials: { attributes: { include: ['passwordHash', 'phone', 'email'] } } },
  },
);
export const Squad = sequelize.define(
  'Squad',
  {
    id,
    squadId: { type: D.STRING, allowNull: false, unique: true },
    name: { type: D.STRING, allowNull: false, unique: true },
    description: D.TEXT,
    game: { type: D.STRING, defaultValue: 'Free Fire' },
    isOpen: { type: D.BOOLEAN, defaultValue: true },
    lookingForRole: { type: D.ENUM(...roles), allowNull: true },
    leaderId: {
      type: D.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    avatar: D.STRING,
  },
  { tableName: 'squads' },
);
export const SquadMember = sequelize.define(
  'SquadMember',
  {
    id,
    squadId: {
      type: D.UUID,
      allowNull: false,
      references: { model: Squad, key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: D.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    role: { type: D.ENUM(...roles), allowNull: false },
    joinedAt: { type: D.DATE, defaultValue: D.NOW },
  },
  {
    tableName: 'squad_members',
    timestamps: false,
    indexes: [{ unique: true, fields: ['userId', 'squadId'] }],
  },
);
export const Message = sequelize.define(
  'Message',
  {
    id,
    senderId: {
      type: D.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    receiverId: {
      type: D.UUID,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    squadId: {
      type: D.UUID,
      allowNull: true,
      references: { model: Squad, key: 'id' },
      onDelete: 'CASCADE',
    },
    content: { type: D.TEXT, allowNull: false },
    messageType: { type: D.ENUM('text', 'image'), defaultValue: 'text' },
    imageUrl: D.STRING,
    isRead: { type: D.BOOLEAN, defaultValue: false },
  },
  {
    tableName: 'messages',
    updatedAt: false,
    indexes: [
      { fields: ['squadId', 'createdAt'] },
      { fields: ['senderId', 'receiverId', 'createdAt'] },
    ],
  },
);
export const SquadInvite = sequelize.define(
  'SquadInvite',
  {
    id,
    squadId: {
      type: D.UUID,
      allowNull: false,
      references: { model: Squad, key: 'id' },
      onDelete: 'CASCADE',
    },
    inviterId: {
      type: D.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    inviteeId: {
      type: D.UUID,
      allowNull: true,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    inviteCode: { type: D.STRING(6), allowNull: false, unique: true },
    status: { type: D.ENUM('pending', 'accepted', 'rejected', 'expired'), defaultValue: 'pending' },
    expiresAt: {
      type: D.DATE,
      allowNull: false,
      defaultValue: () => new Date(Date.now() + 7 * 86400000),
    },
  },
  { tableName: 'squad_invites' },
);
export const SquadJoinRequest = sequelize.define(
  'SquadJoinRequest',
  {
    id: { type: D.UUID, defaultValue: D.UUIDV4, primaryKey: true },
    squadId: {
      type: D.UUID,
      allowNull: false,
      references: { model: Squad, key: 'id' },
      onDelete: 'CASCADE',
    },
    userId: {
      type: D.UUID,
      allowNull: false,
      references: { model: User, key: 'id' },
      onDelete: 'CASCADE',
    },
    status: {
      type: D.ENUM('pending', 'accepted', 'rejected'),
      allowNull: false,
      defaultValue: 'pending',
    },
  },
  { tableName: 'squad_join_requests', indexes: [{ unique: true, fields: ['squadId', 'userId'] }] },
);
SquadJoinRequest.belongsTo(Squad, { as: 'squad', foreignKey: 'squadId' });
SquadJoinRequest.belongsTo(User, { as: 'user', foreignKey: 'userId' });
SquadInvite.belongsTo(Squad, { as: 'squad', foreignKey: 'squadId' });
Squad.hasMany(SquadMember, { as: 'roster', foreignKey: 'squadId' });
SquadMember.belongsTo(User, { as: 'user', foreignKey: 'userId' });
Message.belongsTo(User, { as: 'sender', foreignKey: 'senderId' });
export const publicUser = (user) => {
  const value = user.toJSON ? user.toJSON() : { ...user };
  delete value.passwordHash;
  delete value.phone;
  delete value.email;
  return value;
};
export const serializeSquad = (squad) => {
  const value = squad.toJSON();
  value.members = (value.roster || []).map((member) => ({
    ...publicUser(member.user),
    role: member.role,
  }));
  delete value.roster;
  return value;
};
