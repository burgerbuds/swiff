import { h, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import { isEmpty } from './utils'

const OptionsTemplate = ({ selectProps }) => (
    <div>
        <SelectInput {...selectProps} />
    </div>
)

const MessageTemplate = ({ messages }) => (
    <div>
        {!isEmpty(messages) &&
            messages.map(({ text, type }, i) => (
                <Text>
                    {type === 'heading' && <Text bold>{`\n${text}\n`}</Text>}
                    <Text dim={messages.length - 1 !== i}>
                        {type === 'error' && `💩  ${text}`}
                        {type === 'success' && `👌  ${text}`}
                        {type === 'message' && `💁‍  ${text}`}
                        {type === 'working' &&
                            (messages.length - 1 === i ? (
                                <Spinner type="runner" />
                            ) : (
                                `🏃 `
                            ))}
                        {type === 'working' && ` ${text}`}
                        <br />
                    </Text>
                </Text>
            ))}
    </div>
)

export { OptionsTemplate, MessageTemplate }
