interface PlaygroundActionsProps {
    onReset: () => void;
}

export const PlaygroundActions = ({ onReset }: PlaygroundActionsProps) => {
    return (
        <div className="actions">
            <button className="button button-quiet" type="button" onClick={onReset}>
                Reset
            </button>
        </div>
    );
};
