const { generateGqlQueries } = require('condo-graphql-client')

const REGISTRY_FILE_FIELDS = `{ id file { id filename originalFilename publicUrl mimetype } summary { amount accounts properties } billingIntegrationOrganizationContextId  status format billingCategoryId period  accountNumber tin routingNumber }`

const RegistryFile = generateGqlQueries('RegistryFile', REGISTRY_FILE_FIELDS)

module.exports = {
    RegistryFile,
}