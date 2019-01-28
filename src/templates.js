import { h, Text } from 'ink'
import SelectInput from 'ink-select-input'
import Spinner from 'ink-spinner'
import { isEmpty } from './utils'

const OptionsTemplate = ({ selectProps }) => <SelectInput {...selectProps} />

const MessageTemplate = ({ messages, isFlaggedStart }) => (
    <Text>
        {!isEmpty(messages) &&
            messages.map(({ text, type }, i) => (
                <Text>
                    {type === 'heading' && !isFlaggedStart && (
                        <Text bold>{`—— ${text} ——\n`}</Text>
                    )}
                    {type === 'heading' && isFlaggedStart && (
                        <Text bold>{`${text}\n`}</Text>
                    )}
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
    </Text>
)

export { OptionsTemplate, MessageTemplate }
