module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@paybridge/shared-types$': '<rootDir>/../../../packages/shared-types/src',
    '^@paybridge/shared-utils$': '<rootDir>/../../../packages/shared-utils/src',
  },
};
