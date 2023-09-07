require('dotenv').config()
const { createReadStream } = require('fs')
const {
    HOUSING_CATEGORY_ID,
    DOMA_FORMAT,
    DOMA_EXTENDED_FORMAT,
    REGISTRY_FILE_CREATE_STATUS,
    REGISTRY_FILE_READY_TO_PUBLISH_STATUS,
    REGISTRY_FILE_APPROVED_STATUS,
    REGISTRY_FILE_DONE_STATUS,
} = require('./lib/constants')
const { UserClient } = require('condo-graphql-client')
const { RegistryFile: RegistryFileGql } = require('./lib/condo.gql')

const REGISTRY_URL = process.env.REGISTRY_URL
const { endpoint, authRequisites } = process.env.CONDO_INTEGRATION ? JSON.parse(process.env.CONDO_INTEGRATION) : {}
const BILLING_CONTEXT = process.env.BILLING_CONTEXT

const sleep = (seconds = 1) => new Promise(resolve => setTimeout(resolve, seconds * 1000))

const waitForFileStatusChange = async (client, id, status, retries = 10) => {
    while ( --retries > 0) {
        await sleep(1)
        const [file] = await client.getModels({
            modelGql: RegistryFileGql,
            where: { id }
        })
        if (file.status === status) {
            return file
        }
    }
    client.error('Wait failed', { id, status })
}


const uploadRegistryFileExample = async () => {
    console.time('API')
    console.log('1. Авторизация')
    const client = new UserClient(endpoint, authRequisites)
    await client.signIn()
    const registryMiniApp = await client.signInToMiniApp(`${REGISTRY_URL}/graphql`)
    console.log('2. Отправка файла на обработку')
    const newRegistryFile = await registryMiniApp.createModel({
        modelGql: RegistryFileGql,
        createInput: {
            billingIntegrationOrganizationContextId: BILLING_CONTEXT,
            billingCategoryId: HOUSING_CATEGORY_ID,
            routingNumber: '040813608', // БИК
            tin: '2721112498', // ИНН
            accountNumber: '40703810270000003883', // Р/С
            format: DOMA_EXTENDED_FORMAT,
            period: '2023-07-01',
            file: registryMiniApp.createUploadFile(createReadStream('./files/doma-detailed-fixed-services.xlsx')),
            status: REGISTRY_FILE_CREATE_STATUS,
        },
    })
    console.log('3. Ждем обработки файла')
    const parsedFile = await waitForFileStatusChange(registryMiniApp, newRegistryFile.id, REGISTRY_FILE_READY_TO_PUBLISH_STATUS)
    if (!parsedFile) {
        return
    }
    console.log('4. Отправляем файл на публикацию')
    await registryMiniApp.updateModel({
        modelGql: RegistryFileGql,
        id: parsedFile.id,
        updateInput: {
            status: REGISTRY_FILE_APPROVED_STATUS,
        },
    })
    console.log('5. Ждем окончания публикации файла')
    const published = await waitForFileStatusChange(registryMiniApp, newRegistryFile.id, REGISTRY_FILE_DONE_STATUS)
    if (published) {
        console.log('6. Все получилось!', published['summary'])
    }
    console.timeEnd('API')

}


uploadRegistryFileExample().then(() => {
    process.exit(0)
}).catch(error => {
    console.error(error)
    process.exit(1)
})
