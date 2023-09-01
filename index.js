require('dotenv').config()
const { createReadStream } = require('fs')
const {
    HOUSING_CATEGORY_ID,
    DOMA_FORMAT,
    REGISTRY_FILE_CREATE_STATUS,
} = require('./lib/constants')
const { UserClient } = require('condo-graphql-client')
const { RegistryFile: RegistryFileGql } = require('./lib/condo.gql')

const REGISTRY_URL = process.env.REGISTRY_URL
const { endpoint, authRequisites } = process.env.CONDO_INTEGRATION ? JSON.parse(process.env.CONDO_INTEGRATION) : {}
const BILLING_CONTEXT = process.env.BILLING_CONTEXT

const uploadRegistryFileExample = async () => {

    console.log('1. SignIn to Condo', endpoint, authRequisites)
    const client = new UserClient(endpoint, authRequisites)
    await client.signIn()
    console.log('SignIn Complete', client.userId)

    console.log('2. SignIn to registry miniApp')
    const registryMiniApp = await client.signInToMiniApp(`${REGISTRY_URL}/graphql`)
    const currentUser = await registryMiniApp.currentUser()
    console.log('SignIn Complete', currentUser)

    console.log('3. Sending file to parse')
    const newRegistryFile = await registryMiniApp.createModel({
        modelGql: RegistryFileGql,
        createInput: {
            billingIntegrationOrganizationContextId: BILLING_CONTEXT,
            billingCategoryId: HOUSING_CATEGORY_ID,
            routingNumber: '044525999', // БИК
            tin: '6670082480', // ИНН
            accountNumber: '40702810701500122472', // Р/С
            format: DOMA_FORMAT,
            period: '2023-08-01',
            file: registryMiniApp.createUploadFile(createReadStream('./files/doma-xlsx.xlsx')),
            status: REGISTRY_FILE_CREATE_STATUS,
        },
    })
    console.log('File was added', newRegistryFile)

}


uploadRegistryFileExample().then(() => {
    process.exit(0)
}).catch(error => {
    console.error(error)
    process.exit(1)
})
