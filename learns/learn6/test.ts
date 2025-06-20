import { Table } from ".";

const users = new Table('users', {
    id: {
        type: 'INTEGER', 
        foreignKey: {
            reference: 'users.',
        }
    }
})